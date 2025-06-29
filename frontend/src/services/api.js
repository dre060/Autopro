// frontend/src/services/api.js
import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      Cookies.remove('auth_token');
      localStorage.removeItem('user_data');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// frontend/src/services/vehicleService.js
import api from './api';

export const vehicleService = {
  // Get all vehicles with filters
  getVehicles: async (params = {}) => {
    const response = await api.get('/vehicles', { params });
    return response.data;
  },

  // Get featured vehicles
  getFeatured: async (limit = 6) => {
    const response = await api.get('/vehicles', {
      params: { featured: true, limit }
    });
    return response.data;
  },

  // Get vehicle by ID
  getById: async (id) => {
    const response = await api.get(`/vehicles/${id}`);
    return response.data;
  },

  // Search vehicles
  search: async (query, filters = {}) => {
    const response = await api.get('/vehicles', {
      params: { search: query, ...filters }
    });
    return response.data;
  },

  // Get vehicle makes
  getMakes: async () => {
    const response = await api.get('/vehicles/makes');
    return response.data;
  },

  // Get models for a specific make
  getModels: async (make) => {
    const response = await api.get(`/vehicles/models/${make}`);
    return response.data;
  },

  // Get vehicle statistics
  getStats: async () => {
    const response = await api.get('/vehicles/stats');
    return response.data;
  },

  // Admin functions
  create: async (vehicleData) => {
    const formData = new FormData();
    
    // Append vehicle data
    Object.keys(vehicleData).forEach(key => {
      if (key === 'images') {
        vehicleData[key].forEach(file => {
          formData.append('images', file);
        });
      } else if (typeof vehicleData[key] === 'object') {
        formData.append(key, JSON.stringify(vehicleData[key]));
      } else {
        formData.append(key, vehicleData[key]);
      }
    });

    const response = await api.post('/vehicles', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  update: async (id, vehicleData) => {
    const formData = new FormData();
    
    Object.keys(vehicleData).forEach(key => {
      if (key === 'images' && Array.isArray(vehicleData[key])) {
        vehicleData[key].forEach(file => {
          if (file instanceof File) {
            formData.append('images', file);
          }
        });
      } else if (typeof vehicleData[key] === 'object') {
        formData.append(key, JSON.stringify(vehicleData[key]));
      } else {
        formData.append(key, vehicleData[key]);
      }
    });

    const response = await api.put(`/vehicles/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/vehicles/${id}`);
    return response.data;
  },

  // Bulk operations
  bulkUpdate: async (updates) => {
    const response = await api.patch('/vehicles/bulk', { updates });
    return response.data;
  }
};

// frontend/src/services/serviceService.js
import api from './api';

export const serviceService = {
  // Get all services
  getAll: async () => {
    const response = await api.get('/services');
    return response.data;
  },

  // Get featured services
  getFeatured: async () => {
    const response = await api.get('/services', {
      params: { featured: true }
    });
    return response.data;
  },

  // Get service by slug
  getBySlug: async (slug) => {
    const response = await api.get(`/services/${slug}`);
    return response.data;
  },

  // Get services by category
  getByCategory: async (category) => {
    const response = await api.get('/services', {
      params: { category }
    });
    return response.data;
  },

  // Search services
  search: async (query) => {
    const response = await api.get('/services', {
      params: { search: query }
    });
    return response.data;
  },

  // Admin functions
  create: async (serviceData) => {
    const response = await api.post('/services', serviceData);
    return response.data;
  },

  update: async (id, serviceData) => {
    const response = await api.put(`/services/${id}`, serviceData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/services/${id}`);
    return response.data;
  }
};

// frontend/src/services/testimonialService.js
import api from './api';

export const testimonialService = {
  // Get approved testimonials
  getApproved: async () => {
    const response = await api.get('/testimonials');
    return response.data;
  },

  // Submit new testimonial
  submit: async (testimonialData) => {
    const response = await api.post('/testimonials', testimonialData);
    return response.data;
  },

  // Admin functions
  getAll: async () => {
    const response = await api.get('/admin/testimonials');
    return response.data;
  },

  approve: async (id) => {
    const response = await api.put(`/admin/testimonials/${id}`, {
      approved: true
    });
    return response.data;
  },

  reject: async (id) => {
    const response = await api.put(`/admin/testimonials/${id}`, {
      approved: false
    });
    return response.data;
  },

  feature: async (id) => {
    const response = await api.put(`/admin/testimonials/${id}`, {
      featured: true
    });
    return response.data;
  },

  unfeature: async (id) => {
    const response = await api.put(`/admin/testimonials/${id}`, {
      featured: false
    });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/admin/testimonials/${id}`);
    return response.data;
  }
};

// frontend/src/services/appointmentService.js
import api from './api';

export const appointmentService = {
  // Public appointment booking
  book: async (appointmentData) => {
    const response = await api.post('/appointments', appointmentData);
    return response.data;
  },

  // Get user's appointments
  getMyAppointments: async () => {
    const response = await api.get('/appointments');
    return response.data;
  },

  // Admin functions
  getAll: async (params = {}) => {
    const response = await api.get('/admin/appointments', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/admin/appointments/${id}`);
    return response.data;
  },

  update: async (id, appointmentData) => {
    const response = await api.put(`/appointments/${id}`, appointmentData);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/appointments/${id}/status`, { status });
    return response.data;
  },

  addNote: async (id, note) => {
    const response = await api.post(`/appointments/${id}/notes`, { note });
    return response.data;
  },

  cancel: async (id) => {
    const response = await api.patch(`/appointments/${id}/cancel`);
    return response.data;
  },

  // Get available time slots
  getAvailableSlots: async (date, serviceType) => {
    const response = await api.get('/appointments/available-slots', {
      params: { date, serviceType }
    });
    return response.data;
  }
};

// frontend/src/services/authService.js
import api from './api';

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, password) => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },

  updateProfile: async (userData) => {
    const response = await api.put('/auth/profile', userData);
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put('/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  }
};

// frontend/src/services/contactService.js
import api from './api';

export const contactService = {
  send: async (contactData) => {
    const response = await api.post('/contact', contactData);
    return response.data;
  }
};

// frontend/src/services/analyticsService.js
import api from './api';

export const analyticsService = {
  getDashboardStats: async () => {
    const response = await api.get('/admin/analytics');
    return response.data;
  },

  getVehicleAnalytics: async (timeRange = '30d') => {
    const response = await api.get('/admin/analytics/vehicles', {
      params: { timeRange }
    });
    return response.data;
  },

  getAppointmentAnalytics: async (timeRange = '30d') => {
    const response = await api.get('/admin/analytics/appointments', {
      params: { timeRange }
    });
    return response.data;
  },

  getRevenueAnalytics: async (timeRange = '30d') => {
    const response = await api.get('/admin/analytics/revenue', {
      params: { timeRange }
    });
    return response.data;
  }
};