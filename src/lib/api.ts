import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  
  register: (userData: {
    name: string;
    email: string;
    password: string;
    department: string;
    role: string;
    managerId?: string;
  }) => api.post('/auth/register', userData),
  
  getProfile: () => api.get('/auth/profile'),
  
  updateProfile: (data: { name?: string; department?: string; avatar?: string }) =>
    api.put('/auth/profile', data),
  
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/change-password', data),
  
  getDemoAccounts: () => api.get('/auth/demo-accounts'),
  
  verifyToken: () => api.get('/auth/verify'),
};

// Expenses API
export const expensesAPI = {
  getExpenses: (params?: {
    status?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get('/expenses', { params }),
  
  getExpense: (id: string) => api.get(`/expenses/${id}`),
  
  createExpense: (data: FormData) => 
    api.post('/expenses', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  updateExpense: (id: string, data: FormData) =>
    api.put(`/expenses/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  submitExpense: (id: string) => api.patch(`/expenses/${id}/submit`),
  
  reviewExpense: (id: string, data: {
    action: 'approve' | 'reject';
    comment?: string;
    paymentDetails?: {
      method: string;
      timeline: string;
      accountDetails?: string;
    };
  }) => api.patch(`/expenses/${id}/review`, data),
  
  deleteExpense: (id: string) => api.delete(`/expenses/${id}`),
  
  getStats: () => api.get('/expenses/stats/summary'),
};

// Users API
export const usersAPI = {
  getUsers: () => api.get('/users'),
  
  getUser: (id: string) => api.get(`/users/${id}`),
  
  getTeamMembers: () => api.get('/users/team'),
  
  getManagers: () => api.get('/users/managers'),
  
  updateUser: (id: string, data: {
    name?: string;
    email?: string;
    department?: string;
    role?: string;
    managerId?: string;
    isActive?: boolean;
  }) => api.put(`/users/${id}`, data),
  
  deactivateUser: (id: string) => api.patch(`/users/${id}/deactivate`),
  
  activateUser: (id: string) => api.patch(`/users/${id}/activate`),
  
  getDepartments: () => api.get('/users/departments/list'),
};

// Categories API
export const categoriesAPI = {
  getCategories: () => api.get('/categories'),
  
  createCategory: (data: {
    name: string;
    displayName: string;
    description?: string;
    icon?: string;
  }) => api.post('/categories', data),
  
  updateCategory: (id: string, data: {
    displayName?: string;
    description?: string;
    icon?: string;
    isActive?: boolean;
  }) => api.put(`/categories/${id}`, data),
  
  deleteCategory: (id: string) => api.delete(`/categories/${id}`),
};

export default api;