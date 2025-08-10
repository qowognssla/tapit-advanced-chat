const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
  }

  initialize() {
    return new Promise((resolve, reject) => {
      const dbPath = path.join(__dirname, '..', 'chat.db');
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  createTables() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Users table
        this.db.run(`CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE,
          avatar TEXT,
          status TEXT DEFAULT 'offline',
          lastChanged INTEGER,
          created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
        )`, (err) => {
          if (err) console.error('Error creating users table:', err);
        });

        // Rooms table
        this.db.run(`CREATE TABLE IF NOT EXISTS rooms (
          id TEXT PRIMARY KEY,
          roomName TEXT,
          avatar TEXT,
          lastMessage TEXT,
          lastUpdated INTEGER DEFAULT (strftime('%s', 'now') * 1000),
          created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
        )`, (err) => {
          if (err) console.error('Error creating rooms table:', err);
        });

        // Room users association table
        this.db.run(`CREATE TABLE IF NOT EXISTS room_users (
          room_id TEXT,
          user_id TEXT,
          joined_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
          PRIMARY KEY (room_id, user_id),
          FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`, (err) => {
          if (err) console.error('Error creating room_users table:', err);
        });

        // Messages table
        this.db.run(`CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          room_id TEXT NOT NULL,
          sender_id TEXT NOT NULL,
          content TEXT,
          timestamp INTEGER DEFAULT (strftime('%s', 'now') * 1000),
          edited INTEGER DEFAULT 0,
          deleted INTEGER DEFAULT 0,
          system INTEGER DEFAULT 0,
          saved INTEGER DEFAULT 1,
          distributed INTEGER DEFAULT 0,
          seen INTEGER DEFAULT 0,
          disable_actions INTEGER DEFAULT 0,
          disable_reactions INTEGER DEFAULT 0,
          FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
          FOREIGN KEY (sender_id) REFERENCES users(id)
        )`, (err) => {
          if (err) console.error('Error creating messages table:', err);
        });

        // Message files table
        this.db.run(`CREATE TABLE IF NOT EXISTS message_files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          message_id TEXT NOT NULL,
          name TEXT,
          size INTEGER,
          type TEXT,
          extension TEXT,
          url TEXT,
          preview TEXT,
          audio INTEGER DEFAULT 0,
          duration INTEGER,
          FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
        )`, (err) => {
          if (err) console.error('Error creating message_files table:', err);
        });

        // Message reactions table
        this.db.run(`CREATE TABLE IF NOT EXISTS message_reactions (
          message_id TEXT,
          user_id TEXT,
          reaction TEXT,
          unicode TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
          PRIMARY KEY (message_id, user_id, reaction),
          FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`, (err) => {
          if (err) console.error('Error creating message_reactions table:', err);
        });

        // Typing users table
        this.db.run(`CREATE TABLE IF NOT EXISTS typing_users (
          room_id TEXT,
          user_id TEXT,
          started_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
          PRIMARY KEY (room_id, user_id),
          FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`, (err) => {
          if (err) console.error('Error creating typing_users table:', err);
        });

        resolve();
      });
    });
  }

  // User methods
  createUser(id, username, email = null, avatar = null) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare('INSERT INTO users (id, username, email, avatar) VALUES (?, ?, ?, ?)');
      stmt.run(id, username, email, avatar, function(err) {
        if (err) reject(err);
        else resolve({ id, username, email, avatar });
      });
      stmt.finalize();
    });
  }

  getUserById(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  getUserByUsername(username) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  getAllUsers() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM users', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  updateUserStatus(userId, status) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare('UPDATE users SET status = ?, lastChanged = ? WHERE id = ?');
      stmt.run(status, Date.now(), userId, function(err) {
        if (err) reject(err);
        else resolve({ userId, status });
      });
      stmt.finalize();
    });
  }

  // Room methods
  createRoom(id, roomName = null, avatar = null) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare('INSERT INTO rooms (id, roomName, avatar) VALUES (?, ?, ?)');
      stmt.run(id, roomName, avatar, function(err) {
        if (err) reject(err);
        else resolve({ id, roomName, avatar });
      });
      stmt.finalize();
    });
  }

  getRoomById(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM rooms WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  getUserRooms(userId, limit = 15, offset = 0) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT r.*, 
               GROUP_CONCAT(ru.user_id) as user_ids
        FROM rooms r
        JOIN room_users ru ON r.id = ru.room_id
        WHERE r.id IN (
          SELECT room_id FROM room_users WHERE user_id = ?
        )
        GROUP BY r.id
        ORDER BY r.lastUpdated DESC
        LIMIT ? OFFSET ?
      `;
      
      this.db.all(query, [userId, limit, offset], (err, rows) => {
        if (err) reject(err);
        else {
          // Convert user_ids string to array
          rows = rows.map(row => ({
            ...row,
            users: row.user_ids ? row.user_ids.split(',') : []
          }));
          resolve(rows);
        }
      });
    });
  }

  addUserToRoom(roomId, userId) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare('INSERT OR IGNORE INTO room_users (room_id, user_id) VALUES (?, ?)');
      stmt.run(roomId, userId, function(err) {
        if (err) reject(err);
        else resolve({ roomId, userId });
      });
      stmt.finalize();
    });
  }

  removeUserFromRoom(roomId, userId) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare('DELETE FROM room_users WHERE room_id = ? AND user_id = ?');
      stmt.run(roomId, userId, function(err) {
        if (err) reject(err);
        else resolve({ roomId, userId });
      });
      stmt.finalize();
    });
  }

  // Message methods
  createMessage(messageData) {
    return new Promise((resolve, reject) => {
      const { id, room_id, sender_id, content, timestamp } = messageData;
      const db = this.db; // Store reference to db
      const stmt = db.prepare(`
        INSERT INTO messages (id, room_id, sender_id, content, timestamp) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(id, room_id, sender_id, content, timestamp || Date.now(), function(err) {
        if (err) reject(err);
        else {
          // Update room's last message and timestamp
          const updateStmt = db.prepare(`
            UPDATE rooms SET lastMessage = ?, lastUpdated = ? WHERE id = ?
          `);
          updateStmt.run(content, timestamp || Date.now(), room_id);
          updateStmt.finalize();
          
          resolve({ ...messageData, timestamp: timestamp || Date.now() });
        }
      });
      stmt.finalize();
    });
  }

  getRoomMessages(roomId, limit = 20, beforeTimestamp = null) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT m.*, u.username, u.avatar,
               GROUP_CONCAT(DISTINCT mf.url) as file_urls,
               GROUP_CONCAT(DISTINCT mr.user_id || ':' || mr.reaction || ':' || mr.unicode) as reactions
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        LEFT JOIN message_files mf ON m.id = mf.message_id
        LEFT JOIN message_reactions mr ON m.id = mr.message_id
        WHERE m.room_id = ? AND m.deleted = 0
      `;
      
      const params = [roomId];
      
      if (beforeTimestamp) {
        query += ' AND m.timestamp < ?';
        params.push(beforeTimestamp);
      }
      
      query += ' GROUP BY m.id ORDER BY m.timestamp DESC LIMIT ?';
      params.push(limit);
      
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else {
          // Parse files and reactions
          rows = rows.map(row => {
            const message = { ...row };
            
            // Parse files
            if (row.file_urls) {
              message.files = row.file_urls.split(',').map(url => ({ url }));
            }
            
            // Parse reactions
            if (row.reactions) {
              const reactionsMap = {};
              row.reactions.split(',').forEach(reactionStr => {
                const [userId, reaction, unicode] = reactionStr.split(':');
                if (!reactionsMap[reaction]) {
                  reactionsMap[reaction] = {
                    users: [],
                    reaction,
                    unicode
                  };
                }
                reactionsMap[reaction].users.push(userId);
              });
              message.reactions = reactionsMap;
            }
            
            delete message.file_urls;
            delete message.reactions;
            
            return message;
          });
          
          resolve(rows.reverse()); // Reverse to get chronological order
        }
      });
    });
  }

  updateMessage(messageId, content) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        UPDATE messages SET content = ?, edited = 1 WHERE id = ?
      `);
      stmt.run(content, messageId, function(err) {
        if (err) reject(err);
        else resolve({ messageId, content });
      });
      stmt.finalize();
    });
  }

  deleteMessage(messageId) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare('UPDATE messages SET deleted = 1 WHERE id = ?');
      stmt.run(messageId, function(err) {
        if (err) reject(err);
        else resolve({ messageId });
      });
      stmt.finalize();
    });
  }

  // Reaction methods
  addReaction(messageId, userId, reaction, unicode) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO message_reactions (message_id, user_id, reaction, unicode) 
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(messageId, userId, reaction, unicode, function(err) {
        if (err) reject(err);
        else resolve({ messageId, userId, reaction, unicode });
      });
      stmt.finalize();
    });
  }

  removeReaction(messageId, userId, reaction) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        DELETE FROM message_reactions 
        WHERE message_id = ? AND user_id = ? AND reaction = ?
      `);
      stmt.run(messageId, userId, reaction, function(err) {
        if (err) reject(err);
        else resolve({ messageId, userId, reaction });
      });
      stmt.finalize();
    });
  }

  // Typing indicators
  setUserTyping(roomId, userId) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO typing_users (room_id, user_id) VALUES (?, ?)
      `);
      stmt.run(roomId, userId, function(err) {
        if (err) reject(err);
        else resolve({ roomId, userId });
      });
      stmt.finalize();
    });
  }

  removeUserTyping(roomId, userId) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        DELETE FROM typing_users WHERE room_id = ? AND user_id = ?
      `);
      stmt.run(roomId, userId, function(err) {
        if (err) reject(err);
        else resolve({ roomId, userId });
      });
      stmt.finalize();
    });
  }

  getTypingUsers(roomId) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT user_id FROM typing_users WHERE room_id = ?
      `, [roomId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => row.user_id));
      });
    });
  }
}

module.exports = new Database();

