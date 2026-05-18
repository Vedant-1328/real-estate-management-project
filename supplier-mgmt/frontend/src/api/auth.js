import api from './axiosInstance.js';

export const loginRequest = (email, password) =>
  api.post('/auth/login', { email, password });

export const refreshSession = () => api.post('/auth/refresh');

export const logoutRequest = () => api.post('/auth/logout');
