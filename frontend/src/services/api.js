// API client configuration
import { STORAGE_KEYS } from '../constants/appConstants';

export const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const createIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export class ApiError extends Error {
  constructor(message, statusCode, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const apiClient = async (endpoint, options = {}) => {
  const {
    method = 'GET',
    body = null,
    headers = {},
    includeAuth = true
  } = options;

  const url = `${API_BASE_URL}${endpoint}`;

  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  // Add authorization token if available
  if (includeAuth) {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await response.json() : {};

    if (!response.ok) {
      throw new ApiError(
        data.error || data.message || `Request failed with status ${response.status}`,
        response.status,
        data.details
      );
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Authentication API
export const authAPI = {
  login: (email, password) =>
    apiClient('/auth/login', {
      method: 'POST',
      body: { email, password },
      includeAuth: false
    }),

  register: (firstName, lastName, email, phone, password, role) =>
    apiClient('/auth/register', {
      method: 'POST',
      body: { firstName, lastName, email, phone, password, role },
      includeAuth: false
    }),

  logout: () =>
    apiClient('/auth/logout', {
      method: 'POST'
    }),

  getProfile: () =>
    apiClient('/auth/me')
};

// Admin user management API
export const adminAPI = {
  listUsers: () =>
    apiClient('/admin/users'),

  resetUserPassword: (userId, newPassword) =>
    apiClient(`/admin/users/${userId}/reset-password`, {
      method: 'POST',
      body: { newPassword },
    }),
};

// Events API
export const eventsAPI = {
  getAllEvents: () =>
    apiClient('/events'),

  getEventById: (id) =>
    apiClient(`/events/${id}`),

  createEvent: (eventData) =>
    apiClient('/events', {
      method: 'POST',
      body: eventData,
      headers: {
        'Idempotency-Key': createIdempotencyKey(),
      }
    }),

  updateEvent: (id, eventData) =>
    apiClient(`/events/${id}`, {
      method: 'PUT',
      body: eventData
    }),

  deleteEvent: (id) =>
    apiClient(`/events/${id}`, {
      method: 'DELETE'
    })
};

// Chat API (GPT-powered)
export const chatAPI = {
  createSession: (userId, language = 'en', eventId = null) =>
    apiClient('/chat/session', {
      method: 'POST',
      body: { userId, language, eventId }
    }),

  sendMessage: (userId, sessionId, message, language = 'en', languageLocked = false) =>
    apiClient('/chat/message', {
      method: 'POST',
      body: { userId, sessionId, message, language, languageLocked }
    }),

  getSession: (sessionId) =>
    apiClient(`/chat/session/${sessionId}`, {
      method: 'GET'
    }),

  deleteSession: (sessionId) =>
    apiClient(`/chat/session/${sessionId}`, {
      method: 'DELETE'
    }),
};
