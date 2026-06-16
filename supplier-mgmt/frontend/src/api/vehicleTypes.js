import api from './axiosInstance.js';

export const fetchVehicleTypes = (params) => api.get('/vehicle-types', { params });

export const createVehicleType = (data) => api.post('/vehicle-types', data);

export const updateVehicleType = (id, data) => api.put(`/vehicle-types/${id}`, data);

export const deleteVehicleType = (id) => api.delete(`/vehicle-types/${id}`);
