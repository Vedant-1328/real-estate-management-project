import api from './axiosInstance.js';

export const fetchUsers = (params) => api.get('/users', { params });
export const fetchUser = (id) => api.get(`/users/${id}`);
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const resetUserPassword = (id, data) => api.put(`/users/${id}/reset-password`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
