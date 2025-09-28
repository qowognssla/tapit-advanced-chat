import { io } from 'socket.io-client';
import { SOCKET_URL } from './config';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connected = false;
    this.connectionPromise = null;
    this.pendingEmits = [];
  }

  connect() {
    if (this.socket && this.connected) {
      return Promise.resolve(this.socket);
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      console.log('[SocketService] Attempting connection to', SOCKET_URL);

      this.socket = io(SOCKET_URL, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      const clearPromiseState = () => {
        this.connectionPromise = null;
      };

      const handleConnect = () => {
        console.log('[SocketService] Connected:', this.socket.id);
        this.connected = true;

        this.pendingEmits.forEach(({ event, data }) => {
          this.socket.emit(event, data);
        });
        this.pendingEmits = [];

        this.socket.off('connect_error', handleConnectError);
        this.socket.off('connect_timeout', handleConnectTimeout);
        resolve(this.socket);
      };

      const handleDisconnect = () => {
        console.log('[SocketService] Disconnected');
        this.connected = false;
        clearPromiseState();
      };

      const handleError = (error) => {
        console.error('[SocketService] Error event:', error);
        clearPromiseState();
        reject(error);
      };

      const handleConnectError = (error) => {
        console.error('[SocketService] connect_error:', error?.message || error);
        this.socket.off('connect', handleConnect);
        this.socket.off('error', handleError);
        this.socket.off('connect_timeout', handleConnectTimeout);
        this.socket.off('disconnect', handleDisconnect);
        clearPromiseState();
        reject(error instanceof Error ? error : new Error(String(error)));
      };

      const handleConnectTimeout = (timeout) => {
        console.error('[SocketService] connect_timeout:', timeout);
        this.socket.off('connect', handleConnect);
        this.socket.off('error', handleError);
        this.socket.off('connect_error', handleConnectError);
        this.socket.off('disconnect', handleDisconnect);
        clearPromiseState();
        reject(new Error('Socket connection timeout'));
      };

      this.socket.on('connect', handleConnect);
      this.socket.on('disconnect', handleDisconnect);
      this.socket.on('error', handleError);
      this.socket.on('connect_error', handleConnectError);
      this.socket.on('connect_timeout', handleConnectTimeout);

      // Fallback timeout (10s) in case events never fire
      setTimeout(() => {
        if (!this.connected) {
          console.error('[SocketService] Manual connection timeout hit');
          this.socket.off('connect', handleConnect);
          this.socket.off('disconnect', handleDisconnect);
          this.socket.off('error', handleError);
          this.socket.off('connect_error', handleConnectError);
          this.socket.off('connect_timeout', handleConnectTimeout);
          clearPromiseState();
          reject(new Error('Socket connection timeout'));
        }
      }, 10000);
    });

    return this.connectionPromise;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.connectionPromise = null;
      this.pendingEmits = [];
      this.listeners.clear();
    }
  }

  emit(event, data) {
    if (!this.socket || !this.connected) {
      console.warn('Socket not connected, queuing emit:', event);
      this.pendingEmits.push({ event, data });
      return;
    }
    this.socket.emit(event, data);
  }

  async emitWhenReady(event, data) {
    if (!this.connected) {
      await this.connect();
    }
    this.emit(event, data);
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

  // --- WebRTC signaling helpers ---
  sendWebRTCOffer(roomId, sdp, fromUserId) {
    this.emit('webrtc-offer', { roomId, sdp, fromUserId })
  }
  sendWebRTCAnswer(roomId, sdp, fromUserId) {
    this.emit('webrtc-answer', { roomId, sdp, fromUserId })
  }
  sendWebRTCCandidate(roomId, candidate, fromUserId) {
    this.emit('webrtc-candidate', { roomId, candidate, fromUserId })
  }
}

export default new SocketService();



