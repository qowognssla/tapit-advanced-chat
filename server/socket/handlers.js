module.exports = (io, socket, db) => {
  // Store user's socket info
  let currentUserId = null;
  let joinedRooms = new Set();

  // Handle user connection
  socket.on('user-connect', async (userId) => {
    currentUserId = userId;
    socket.userId = userId;
    
    try {
      // Update user status to online
      await db.updateUserStatus(userId, 'online');
      
      // Join user's rooms
      const userRooms = await db.getUserRooms(userId, 100, 0);
      userRooms.forEach(room => {
        socket.join(`room-${room.id}`);
        joinedRooms.add(room.id);
      });
      
      // Notify other users about online status
      io.emit('user-status-changed', { userId, status: 'online' });
      
      console.log(`User ${userId} connected and joined ${userRooms.length} rooms`);
    } catch (error) {
      console.error('Error in user-connect:', error);
    }
  });

  // Handle joining a room
  socket.on('join-room', (roomId) => {
    socket.join(`room-${roomId}`);
    joinedRooms.add(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  // Handle leaving a room
  socket.on('leave-room', (roomId) => {
    socket.leave(`room-${roomId}`);
    joinedRooms.delete(roomId);
    console.log(`Socket ${socket.id} left room ${roomId}`);
  });

  // Handle sending a message
  socket.on('send-message', async (messageData) => {
    try {
      const { roomId, message } = messageData;
      
      // Save message to database
      const savedMessage = await db.createMessage({
        id: message._id,
        room_id: roomId,
        sender_id: message.senderId,
        content: message.content,
        timestamp: message.timestamp
      });
      
      // Get sender info
      const sender = await db.getUserById(message.senderId);
      
      // Prepare message for clients
      const messageToSend = {
        _id: message._id,
        content: message.content,
        senderId: message.senderId,
        username: sender.username,
        avatar: sender.avatar,
        timestamp: savedMessage.timestamp,
        date: new Date(savedMessage.timestamp).toISOString(),
        saved: true,
        distributed: true,
        seen: false,
        deleted: false,
        failure: false,
        disableActions: false,
        disableReactions: false,
        files: message.files || [],
        reactions: {}
      };
      
      // Send to all users in the room
      io.to(`room-${roomId}`).emit('message-added', {
        roomId,
        message: messageToSend
      });
      
      // Update room's last message
      io.emit('room-updated', {
        roomId,
        lastMessage: {
          content: message.content,
          senderId: message.senderId,
          username: sender.username,
          timestamp: savedMessage.timestamp,
          saved: true,
          distributed: true,
          seen: false,
          new: true
        }
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('message-error', { error: error.message });
    }
  });

  // Handle editing a message
  socket.on('edit-message', async ({ roomId, messageId, newContent }) => {
    try {
      await db.updateMessage(messageId, newContent);
      
      // Notify all users in the room
      io.to(`room-${roomId}`).emit('message-edited', {
        roomId,
        messageId,
        newContent,
        edited: true
      });
    } catch (error) {
      console.error('Error editing message:', error);
      socket.emit('message-error', { error: error.message });
    }
  });

  // Handle deleting a message
  socket.on('delete-message', async ({ roomId, messageId }) => {
    try {
      await db.deleteMessage(messageId);
      
      // Notify all users in the room
      io.to(`room-${roomId}`).emit('message-deleted', {
        roomId,
        messageId
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit('message-error', { error: error.message });
    }
  });

  // Handle message reactions
  socket.on('add-message-reaction', async ({ roomId, messageId, reaction }) => {
    try {
      const { emoji, unicode } = reaction;
      await db.addReaction(messageId, currentUserId, emoji, unicode);
      
      // Get updated reactions
      const message = await db.getRoomMessages(roomId, 1, null);
      const reactions = message[0]?.reactions || {};
      
      // Notify all users in the room
      io.to(`room-${roomId}`).emit('message-reaction-added', {
        roomId,
        messageId,
        userId: currentUserId,
        reaction: { emoji, unicode },
        reactions
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  });

  socket.on('remove-message-reaction', async ({ roomId, messageId, reaction }) => {
    try {
      await db.removeReaction(messageId, currentUserId, reaction.emoji);
      
      // Notify all users in the room
      io.to(`room-${roomId}`).emit('message-reaction-removed', {
        roomId,
        messageId,
        userId: currentUserId,
        reaction
      });
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  });

  // Handle typing indicators
  socket.on('typing-message', async ({ roomId, message }) => {
    try {
      if (message) {
        await db.setUserTyping(roomId, currentUserId);
        
        // Notify other users in the room
        socket.to(`room-${roomId}`).emit('user-started-typing', {
          roomId,
          userId: currentUserId
        });
        
        // Clear typing after 2 seconds of inactivity
        if (socket.typingTimeout) {
          clearTimeout(socket.typingTimeout);
        }
        
        socket.typingTimeout = setTimeout(async () => {
          await db.removeUserTyping(roomId, currentUserId);
          socket.to(`room-${roomId}`).emit('user-stopped-typing', {
            roomId,
            userId: currentUserId
          });
        }, 2000);
      } else {
        // User stopped typing
        if (socket.typingTimeout) {
          clearTimeout(socket.typingTimeout);
        }
        
        await db.removeUserTyping(roomId, currentUserId);
        socket.to(`room-${roomId}`).emit('user-stopped-typing', {
          roomId,
          userId: currentUserId
        });
      }
    } catch (error) {
      console.error('Error handling typing indicator:', error);
    }
  });

  // --- WebRTC Signaling ---
  // Clients will emit signaling events scoped by room
  socket.on('webrtc-offer', ({ roomId, sdp, fromUserId }) => {
    socket.to(`room-${roomId}`).emit('webrtc-offer', { roomId, sdp, fromUserId })
  })
  socket.on('webrtc-answer', ({ roomId, sdp, fromUserId }) => {
    socket.to(`room-${roomId}`).emit('webrtc-answer', { roomId, sdp, fromUserId })
  })
  socket.on('webrtc-candidate', ({ roomId, candidate, fromUserId }) => {
    socket.to(`room-${roomId}`).emit('webrtc-candidate', { roomId, candidate, fromUserId })
  })

  // Handle creating a new room
  socket.on('create-room', async ({ users, roomName }) => {
    try {
      const roomId = 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      // Create room
      await db.createRoom(roomId, roomName);
      
      // Add users to room
      for (const userId of users) {
        await db.addUserToRoom(roomId, userId);
        
        // Make user join the room if they're online
        const userSocket = [...io.sockets.sockets.values()]
          .find(s => s.userId === userId);
        if (userSocket) {
          userSocket.join(`room-${roomId}`);
        }
      }
      
      // Get room details with users
      const room = await db.getRoomById(roomId);
      const roomUsers = await Promise.all(
        users.map(userId => db.getUserById(userId))
      );
      
      const roomData = {
        ...room,
        users: roomUsers.filter(u => u !== null),
        index: Date.now()
      };
      
      // Notify all users in the room
      users.forEach(userId => {
        const userSocket = [...io.sockets.sockets.values()]
          .find(s => s.userId === userId);
        if (userSocket) {
          userSocket.emit('room-added', roomData);
        }
      });
      
      socket.emit('room-created', roomData);
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('room-error', { error: error.message });
    }
  });

  // Handle adding user to room
  socket.on('add-room-user', async ({ roomId, userId }) => {
    try {
      await db.addUserToRoom(roomId, userId);
      
      // Make user join the room if they're online
      const userSocket = [...io.sockets.sockets.values()]
        .find(s => s.userId === userId);
      if (userSocket) {
        userSocket.join(`room-${roomId}`);
        
        // Send room info to the new user
        const room = await db.getRoomById(roomId);
        const roomUsers = await db.getUserRooms(userId, 1, 0);
        userSocket.emit('room-added', roomUsers[0]);
      }
      
      // Notify all users in the room
      io.to(`room-${roomId}`).emit('room-user-added', { roomId, userId });
    } catch (error) {
      console.error('Error adding user to room:', error);
      socket.emit('room-error', { error: error.message });
    }
  });

  // Handle removing user from room
  socket.on('remove-room-user', async ({ roomId, userId }) => {
    try {
      await db.removeUserFromRoom(roomId, userId);
      
      // Make user leave the room if they're online
      const userSocket = [...io.sockets.sockets.values()]
        .find(s => s.userId === userId);
      if (userSocket) {
        userSocket.leave(`room-${roomId}`);
        userSocket.emit('room-removed', { roomId });
      }
      
      // Notify all users in the room
      io.to(`room-${roomId}`).emit('room-user-removed', { roomId, userId });
    } catch (error) {
      console.error('Error removing user from room:', error);
      socket.emit('room-error', { error: error.message });
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    if (currentUserId) {
      try {
        // Update user status to offline
        await db.updateUserStatus(currentUserId, 'offline');
        
        // Clear any typing indicators
        for (const roomId of joinedRooms) {
          await db.removeUserTyping(roomId, currentUserId);
          socket.to(`room-${roomId}`).emit('user-stopped-typing', {
            roomId,
            userId: currentUserId
          });
        }
        
        // Notify other users about offline status
        io.emit('user-status-changed', { userId: currentUserId, status: 'offline' });
        
        console.log(`User ${currentUserId} disconnected`);
      } catch (error) {
        console.error('Error in disconnect:', error);
      }
    }
  });
};




