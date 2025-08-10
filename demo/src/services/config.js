// API configuration
export const API_BASE_URL = 'http://localhost:3001';
export const SOCKET_URL = 'http://localhost:3001';

// Default JWT token for demo (in production, this should be stored securely)
let authToken = localStorage.getItem('authToken') || null;

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

export const getAuthToken = () => authToken;

export const getAuthHeaders = () => ({
  'Authorization': authToken ? `Bearer ${authToken}` : '',
  'Content-Type': 'application/json'
});




