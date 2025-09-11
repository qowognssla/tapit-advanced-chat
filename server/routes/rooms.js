const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { verifyToken } = require('../middleware/auth');

// Get user's rooms
router.get('/', verifyToken, async (req, res) => {
  try {
    const { limit = 15, offset = 0 } = req.query;
    const rooms = await db.getUserRooms(req.userId, parseInt(limit), parseInt(offset));
    
    // Get users for each room
    const roomsWithUsers = await Promise.all(rooms.map(async (room) => {
      const users = await Promise.all(room.users.map(userId => db.getUserById(userId)));
      
      return {
        _id: room.id,
        roomName: room.roomName,
        avatar: room.avatar,
        users: users.filter(u => u).map(user => ({
          _id: user.id,
          username: user.username,
          avatar: user.avatar,
          status: {
            state: user.status || 'offline',
            lastChanged: user.lastChanged
          }
        })),
        unreadCount: 0,
        typingUsers: [],
        index: room.lastUpdated,
        lastMessage: room.lastMessage ? {
          _id: 'msg_' + room.lastUpdated,
          content: room.lastMessage,
          timestamp: room.lastUpdated,
          date: new Date(room.lastUpdated).toISOString(),
          saved: true,
          distributed: true,
          seen: false,
          new: false
        } : null
      };
    }));
    
    res.json(roomsWithUsers);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single room
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const room = await db.getRoomById(req.params.id);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Get room users
    const roomUsers = await db.getUserRooms(req.userId, 1, 0);
    const roomData = roomUsers.find(r => r.id === req.params.id);
    
    if (!roomData) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const users = await Promise.all(roomData.users.map(userId => db.getUserById(userId)));
    
    res.json({
      _id: room.id,
      roomName: room.roomName,
      avatar: room.avatar,
      users: users.filter(u => u).map(user => ({
        _id: user.id,
        username: user.username,
        avatar: user.avatar,
        status: {
          state: user.status || 'offline',
          lastChanged: user.lastChanged
        }
      })),
      typingUsers: []
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new room
router.post('/', verifyToken, async (req, res) => {
  try {
    const { users, roomName } = req.body;
    
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: 'Users array is required' });
    }
    
    // Always include the current user
    if (!users.includes(req.userId)) {
      users.push(req.userId);
    }
    
    const roomId = 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Create room
    await db.createRoom(roomId, roomName);
    
    // Add users to room
    for (const userId of users) {
      await db.addUserToRoom(roomId, userId);
    }
    
    // Get room details
    const room = await db.getRoomById(roomId);
    const roomUsers = await Promise.all(users.map(userId => db.getUserById(userId)));
    
    res.json({
      _id: room.id,
      roomName: room.roomName,
      avatar: room.avatar,
      users: roomUsers.filter(u => u).map(user => ({
        _id: user.id,
        username: user.username,
        avatar: user.avatar,
        status: {
          state: user.status || 'offline',
          lastChanged: user.lastChanged
        }
      })),
      unreadCount: 0,
      typingUsers: [],
      index: room.lastUpdated,
      lastMessage: null
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a room
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    // Check if user is in the room
    const userRooms = await db.getUserRooms(req.userId, 100, 0);
    const hasAccess = userRooms.some(room => room.id === req.params.id);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // For now, we'll just remove all users from the room
    // In a real app, you might want to actually delete the room
    const room = userRooms.find(r => r.id === req.params.id);
    if (room) {
      for (const userId of room.users) {
        await db.removeUserFromRoom(req.params.id, userId);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;








