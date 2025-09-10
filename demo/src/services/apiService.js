import axios from 'axios';
import { API_BASE_URL, getAuthHeaders } from './config';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(method, endpoint, data = null) {
    try {
      console.log(`🔍 ApiService: Making ${method} request to ${endpoint}`);
      console.log(`🔍 ApiService: Base URL: ${this.baseURL}`);
      console.log(`🔍 ApiService: Data/Params:`, data);
      
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: getAuthHeaders(),
      };

      console.log(`🔍 ApiService: Full URL: ${config.url}`);
      console.log(`🔍 ApiService: Headers:`, config.headers);

      if (data) {
        if (method === 'GET') {
          config.params = data;
        } else {
          config.data = data;
        }
      }

      const response = await axios(config);
      console.log(`✅ ApiService: ${method} ${endpoint} response:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ ApiService Error [${method} ${endpoint}]:`, error);
      if (error.response) {
        console.error(`❌ Response status:`, error.response.status);
        console.error(`❌ Response data:`, error.response.data);
      }
      throw error;
    }
  }

  // Auth endpoints
  async login(username) {
    return this.request('POST', '/api/auth/login', { username });
  }

  // User endpoints
  async getAllUsers() {
    return this.request('GET', '/api/users');
  }

  async getUserById(userId) {
    return this.request('GET', `/api/users/${userId}`);
  }

  async searchUserByUsername(username) {
    return this.request('GET', `/api/users/search/${username}`);
  }

  // Room endpoints
  async getRooms(limit = 15, offset = 0) {
    console.log('🔍 ApiService: Making GET request to /api/rooms with params:', { limit, offset });
    const result = await this.request('GET', '/api/rooms', { limit, offset });
    console.log('✅ ApiService: GET /api/rooms response:', result);
    return result;
  }

  async getRoomById(roomId) {
    return this.request('GET', `/api/rooms/${roomId}`);
  }

  async createRoom(users, roomName = null) {
    return this.request('POST', '/api/rooms', { users, roomName });
  }

  async deleteRoom(roomId) {
    return this.request('DELETE', `/api/rooms/${roomId}`);
  }

  // Message endpoints
  async getRoomMessages(roomId, limit = 20, before = null) {
    const params = { limit };
    if (before) params.before = before;
    return this.request('GET', `/api/messages/room/${roomId}`, params);
  }

  async sendMessage(roomId, content, files = []) {
    return this.request('POST', `/api/messages/room/${roomId}`, { content, files });
  }

  async editMessage(messageId, content) {
    return this.request('PUT', `/api/messages/${messageId}`, { content });
  }

  async deleteMessage(messageId) {
    return this.request('DELETE', `/api/messages/${messageId}`);
  }

  async addReaction(messageId, emoji, unicode) {
    return this.request('POST', `/api/messages/${messageId}/reactions`, { emoji, unicode });
  }

  async removeReaction(messageId, reaction) {
    return this.request('DELETE', `/api/messages/${messageId}/reactions/${reaction}`);
  }

  // File upload
  async uploadFile(file, userId) {
    const formData = new FormData();
    formData.append('file', file.blob || file, file.name);
    formData.append('userId', userId);

    const response = await axios.post(`${this.baseURL}/api/upload`, formData, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }
}

export default new ApiService();





