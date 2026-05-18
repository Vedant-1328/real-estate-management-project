import api from './axiosInstance.js';

export const fetchDriverAdvances = (params) => api.get('/driver-advances', { params });

export const createDriverAdvance = (data) => api.post('/driver-advances', data);

export const updateDriverAdvance = (id, data) => api.put(`/driver-advances/${id}`, data);

export const deleteDriverAdvance = (id) => api.delete(`/driver-advances/${id}`);

export const fetchDriverSalarySummary = (params) =>
  api.get('/driver-advances/salary-summary', { params });

export const processDriverSalary = (data) => api.post('/driver-advances/process-salary', data);
