const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { verifyToken } = require('../middleware/auth');

// Get all users
router.get('/', verifyToken, async (req, res) => {
  try {
    const users = await db.getAllUsers();
    
    // Format users for client
    const formattedUsers = users.map(user => ({
      _id: user.id,
      username: user.username,
      avatar: user.avatar,
      status: {
        state: user.status || 'offline',
        lastChanged: user.lastChanged
      }
    }));
    
    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      _id: user.id,
      username: user.username,
      avatar: user.avatar,
      status: {
        state: user.status || 'offline',
        lastChanged: user.lastChanged
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search users by username
router.get('/search/:username', verifyToken, async (req, res) => {
  try {
    const user = await db.getUserByUsername(req.params.username);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      _id: user.id,
      username: user.username,
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Error searching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;







