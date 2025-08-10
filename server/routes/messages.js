const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { verifyToken } = require('../middleware/auth');

// Get messages for a room
router.get('/room/:roomId', verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 20, before } = req.query;
    
    // Check if user has access to the room
    const userRooms = await db.getUserRooms(req.userId, 100, 0);
    const hasAccess = userRooms.some(room => room.id === roomId);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get messages
    const messages = await db.getRoomMessages(
      roomId, 
      parseInt(limit), 
      before ? parseInt(before) : null
    );
    
    // Format messages for client
    const formattedMessages = messages.map(msg => ({
      _id: msg.id,
      content: msg.content,
      senderId: msg.sender_id,
      username: msg.username,
      avatar: msg.avatar,
      date: new Date(msg.timestamp).toISOString(),
      timestamp: msg.timestamp,
      system: msg.system === 1,
      saved: msg.saved === 1,
      distributed: msg.distributed === 1,
      seen: msg.seen === 1,
      deleted: msg.deleted === 1,
      failure: false,
      disableActions: msg.disable_actions === 1,
      disableReactions: msg.disable_reactions === 1,
      files: msg.files || [],
      reactions: msg.reactions || {}
    }));
    
    res.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send a message
router.post('/room/:roomId', verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, files = [] } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    // Check if user has access to the room
    const userRooms = await db.getUserRooms(req.userId, 100, 0);
    const hasAccess = userRooms.some(room => room.id === roomId);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const timestamp = Date.now();
    
    // Save message
    const message = await db.createMessage({
      id: messageId,
      room_id: roomId,
      sender_id: req.userId,
      content,
      timestamp
    });
    
    // Get sender info
    const sender = await db.getUserById(req.userId);
    
    res.json({
      _id: messageId,
      content,
      senderId: req.userId,
      username: sender.username,
      avatar: sender.avatar,
      date: new Date(timestamp).toISOString(),
      timestamp,
      saved: true,
      distributed: true,
      seen: false,
      deleted: false,
      failure: false,
      disableActions: false,
      disableReactions: false,
      files,
      reactions: {}
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Edit a message
router.put('/:messageId', verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    await db.updateMessage(messageId, content);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a message
router.delete('/:messageId', verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    await db.deleteMessage(messageId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add reaction to message
router.post('/:messageId/reactions', verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji, unicode } = req.body;
    
    if (!emoji || !unicode) {
      return res.status(400).json({ error: 'Emoji and unicode are required' });
    }
    
    await db.addReaction(messageId, req.userId, emoji, unicode);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove reaction from message
router.delete('/:messageId/reactions/:reaction', verifyToken, async (req, res) => {
  try {
    const { messageId, reaction } = req.params;
    
    await db.removeReaction(messageId, req.userId, reaction);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;




