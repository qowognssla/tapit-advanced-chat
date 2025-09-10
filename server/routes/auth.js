const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { generateToken } = require('../middleware/auth');

// Simple login/register endpoint (for demo purposes)
router.post('/login', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Check if user exists
    let user = await db.getUserByUsername(username);
    let isNewUser = false;
    
    if (!user) {
      // Create new user for demo
      const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;
      
      user = await db.createUser(userId, username, null, avatar);
      user = await db.getUserById(userId);
      isNewUser = true;
    }
    
    // Create a default room for new users or if no rooms exist
    if (isNewUser) {
      const roomId = 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      await db.createRoom(roomId, `Welcome ${username}!`);
      await db.addUserToRoom(roomId, user.id);
      console.log(`Created default room ${roomId} for user ${user.id}`);
    } else {
      // Check if user has any rooms
      const userRooms = await db.getUserRooms(user.id, 1, 0);
      if (userRooms.length === 0) {
        const roomId = 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        await db.createRoom(roomId, `Welcome ${username}!`);
        await db.addUserToRoom(roomId, user.id);
        console.log(`Created default room ${roomId} for existing user ${user.id}`);
      }
    }
    
    // Generate token
    const token = generateToken(user.id);
    
    res.json({
      token,
      user: {
        _id: user.id,
        username: user.username,
        avatar: user.avatar,
        status: {
          state: user.status || 'online',
          lastChanged: user.lastChanged
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;







