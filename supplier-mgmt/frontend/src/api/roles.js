import api from './axiosInstance.js';

export const fetchRoles = () => api.get('/roles');
export const createRole = (data) => api.post('/roles', data);
export const updateRole = (id, data) => api.put(`/roles/${id}`, data);
export const fetchRolePermissions = (id) => api.get(`/roles/${id}/permissions`);
export const saveRolePermissions = (id, permissions) =>
  api.put(`/roles/${id}/permissions`, { permissions });
