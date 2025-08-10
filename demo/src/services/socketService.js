import { io } from 'socket.io-client';
import { SOCKET_URL } from './config';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connected = false;
  }

  connect() {
    if (this.socket && this.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.connected = false;
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.listeners.clear();
    }
  }

  emit(event, data) {
    if (!this.socket || !this.connected) {
      console.error('Socket not connected');
      return;
    }
    this.socket.emit(event, data);
  }

  on(event, callback) {
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }

    // Store the listener reference
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    this.socket.on(event, callback);
  }

  off(event, callback) {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback);
      if (this.listeners.has(event)) {
        this.listeners.get(event).delete(callback);
      }
    } else {
      // Remove all listeners for this event
      this.socket.off(event);
      this.listeners.delete(event);
    }
  }

  // Convenience methods for common events
  onUserConnect(userId) {
    this.emit('user-connect', userId);
  }

  joinRoom(roomId) {
    this.emit('join-room', roomId);
  }

  leaveRoom(roomId) {
    this.emit('leave-room', roomId);
  }

  sendMessage(roomId, message) {
    this.emit('send-message', { roomId, message });
  }

  editMessage(roomId, messageId, newContent) {
    this.emit('edit-message', { roomId, messageId, newContent });
  }

  deleteMessage(roomId, messageId) {
    this.emit('delete-message', { roomId, messageId });
  }

  sendTypingIndicator(roomId, message) {
    this.emit('typing-message', { roomId, message });
  }

  addMessageReaction(roomId, messageId, reaction) {
    this.emit('add-message-reaction', { roomId, messageId, reaction });
  }

  removeMessageReaction(roomId, messageId, reaction) {
    this.emit('remove-message-reaction', { roomId, messageId, reaction });
  }

  createRoom(users, roomName) {
    this.emit('create-room', { users, roomName });
  }

  addRoomUser(roomId, userId) {
    this.emit('add-room-user', { roomId, userId });
  }

  removeRoomUser(roomId, userId) {
    this.emit('remove-room-user', { roomId, userId });
  }
}

export default new SocketService();




