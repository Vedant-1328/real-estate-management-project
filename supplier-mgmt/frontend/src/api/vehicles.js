import api from './axiosInstance.js';

export const fetchVehicles = (params) => api.get('/vehicles', { params });

export const fetchVehicle = (id) => api.get(`/vehicles/${id}`);

export const createVehicle = (data) => api.post('/vehicles', data);

export const updateVehicle = (id, data) => api.put(`/vehicles/${id}`, data);

export const deleteVehicle = (id) => api.delete(`/vehicles/${id}`);

export const uploadVehicleDocument = (vehicleId, formData) =>
  api.post(`/vehicles/${vehicleId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteVehicleDocument = (vehicleId, docId) =>
  api.delete(`/vehicles/${vehicleId}/documents/${docId}`);
