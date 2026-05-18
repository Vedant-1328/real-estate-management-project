import api from './axiosInstance.js';

export const fetchDrivers = (params) => api.get('/drivers', { params });

export const fetchDriver = (id) => api.get(`/drivers/${id}`);

export const createDriver = (data) => api.post('/drivers', data);

export const quickAddOutsideDriver = (data) => api.post('/drivers/quick-outside', data);

export const updateDriver = (id, data) => api.put(`/drivers/${id}`, data);

export const deleteDriver = (id) => api.delete(`/drivers/${id}`);

export const uploadDriverDocument = (driverId, formData) =>
  api.post(`/drivers/${driverId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteDriverDocument = (driverId, docId) =>
  api.delete(`/drivers/${driverId}/documents/${docId}`);
