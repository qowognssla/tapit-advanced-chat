import apiService from './apiService';
import socketService from './socketService';
import { setAuthToken } from './config';

class ChatService {
  constructor() {
    this.currentUser = null;
    this.typingTimeouts = new Map();
  }

  // Initialize the chat service
  async initialize(username) {
    try {
      // Login and get token
      const loginResponse = await apiService.login(username);
      setAuthToken(loginResponse.token);
      this.currentUser = loginResponse.user;

      // Connect to socket
      socketService.connect();
      socketService.onUserConnect(this.currentUser._id);

      return this.currentUser;
    } catch (error) {
      console.error('Failed to initialize chat service:', error);
      throw error;
    }
  }

  // Disconnect and cleanup
  disconnect() {
    socketService.disconnect();
    setAuthToken(null);
    this.currentUser = null;
    this.typingTimeouts.clear();
  }

  // User methods
  async getAllUsers() {
    return apiService.getAllUsers();
  }

  async getUserByUsername(username) {
    return apiService.searchUserByUsername(username);
  }

  // Room methods
  async getRooms(limit = 15, offset = 0) {
    const rooms = await apiService.getRooms(limit, offset);
    
    // Join all rooms via socket
    rooms.forEach(room => {
      socketService.joinRoom(room._id);
    });

    return rooms;
  }

  async createRoom(users, roomName = null) {
    // Include current user if not already included
    if (!users.includes(this.currentUser._id)) {
      users.push(this.currentUser._id);
    }

    // Create room via API (socket event will be handled in the callback)
    return new Promise((resolve, reject) => {
      socketService.createRoom(users, roomName);
      
      // Listen for room creation response
      const handleRoomCreated = (room) => {
        socketService.off('room-created', handleRoomCreated);
        socketService.off('room-error', handleRoomError);
        resolve(room);
      };

      const handleRoomError = (error) => {
        socketService.off('room-created', handleRoomCreated);
        socketService.off('room-error', handleRoomError);
        reject(error);
      };

      socketService.on('room-created', handleRoomCreated);
      socketService.on('room-error', handleRoomError);
    });
  }

  async addUserToRoom(roomId, username) {
    const user = await apiService.searchUserByUsername(username);
    if (!user) {
      throw new Error('User not found');
    }

    socketService.addRoomUser(roomId, user._id);
    return user;
  }

  async removeUserFromRoom(roomId, userId) {
    socketService.removeRoomUser(roomId, userId);
  }

  async deleteRoom(roomId) {
    await apiService.deleteRoom(roomId);
    socketService.leaveRoom(roomId);
  }

  // Message methods
  async getMessages(roomId, options = {}) {
    const messages = await apiService.getRoomMessages(
      roomId,
      options.limit || 20,
      options.lastLoadedMessage?.timestamp
    );

    return messages;
  }

  async sendMessage(roomId, messageData) {
    const message = {
      _id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: messageData.content,
      senderId: this.currentUser._id,
      timestamp: Date.now(),
      files: messageData.files || []
    };

    // Send via socket for real-time delivery
    socketService.sendMessage(roomId, message);

    return message;
  }

  async editMessage(roomId, messageId, newContent) {
    socketService.editMessage(roomId, messageId, newContent);
    return apiService.editMessage(messageId, newContent);
  }

  async deleteMessage(roomId, messageId) {
    socketService.deleteMessage(roomId, messageId);
    return apiService.deleteMessage(messageId);
  }

  // File upload
  async uploadFile(file) {
    return apiService.uploadFile(file, this.currentUser._id);
  }

  // Reactions
  async addMessageReaction(roomId, messageId, reaction) {
    socketService.addMessageReaction(roomId, messageId, reaction);
    return apiService.addReaction(messageId, reaction.emoji, reaction.unicode);
  }

  async removeMessageReaction(roomId, messageId, reaction) {
    socketService.removeMessageReaction(roomId, messageId, reaction);
    return apiService.removeReaction(messageId, reaction.emoji);
  }

  // Typing indicators
  sendTypingIndicator(roomId, message) {
    socketService.sendTypingIndicator(roomId, message);

    // Clear existing timeout for this room
    if (this.typingTimeouts.has(roomId)) {
      clearTimeout(this.typingTimeouts.get(roomId));
    }

    // Set timeout to stop typing indicator
    if (message) {
      const timeout = setTimeout(() => {
        socketService.sendTypingIndicator(roomId, '');
        this.typingTimeouts.delete(roomId);
      }, 2000);
      this.typingTimeouts.set(roomId, timeout);
    } else {
      this.typingTimeouts.delete(roomId);
    }
  }

  // Socket event listeners setup
  setupSocketListeners(callbacks) {
    const {
      onMessageAdded,
      onMessageEdited,
      onMessageDeleted,
      onRoomAdded,
      onRoomUpdated,
      onRoomRemoved,
      onUserStatusChanged,
      onUserStartedTyping,
      onUserStoppedTyping,
      onMessageReactionAdded,
      onMessageReactionRemoved
    } = callbacks;

    if (onMessageAdded) {
      socketService.on('message-added', onMessageAdded);
    }
    if (onMessageEdited) {
      socketService.on('message-edited', onMessageEdited);
    }
    if (onMessageDeleted) {
      socketService.on('message-deleted', onMessageDeleted);
    }
    if (onRoomAdded) {
      socketService.on('room-added', onRoomAdded);
    }
    if (onRoomUpdated) {
      socketService.on('room-updated', onRoomUpdated);
    }
    if (onRoomRemoved) {
      socketService.on('room-removed', onRoomRemoved);
    }
    if (onUserStatusChanged) {
      socketService.on('user-status-changed', onUserStatusChanged);
    }
    if (onUserStartedTyping) {
      socketService.on('user-started-typing', onUserStartedTyping);
    }
    if (onUserStoppedTyping) {
      socketService.on('user-stopped-typing', onUserStoppedTyping);
    }
    if (onMessageReactionAdded) {
      socketService.on('message-reaction-added', onMessageReactionAdded);
    }
    if (onMessageReactionRemoved) {
      socketService.on('message-reaction-removed', onMessageReactionRemoved);
    }
  }

  // Clean up socket listeners
  removeSocketListeners() {
    socketService.off('message-added');
    socketService.off('message-edited');
    socketService.off('message-deleted');
    socketService.off('room-added');
    socketService.off('room-updated');
    socketService.off('room-removed');
    socketService.off('user-status-changed');
    socketService.off('user-started-typing');
    socketService.off('user-stopped-typing');
    socketService.off('message-reaction-added');
    socketService.off('message-reaction-removed');
  }
}

export default new ChatService();




