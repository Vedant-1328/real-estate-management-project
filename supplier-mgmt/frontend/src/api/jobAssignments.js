import api from './axiosInstance.js';

export const fetchAssignments = (params) => api.get('/job-assignments', { params });

export const fetchAssignment = (id) => api.get(`/job-assignments/${id}`);

export const fetchEffectiveRate = (params) =>
  api.get('/job-assignments/effective-rate', { params });

export const createAssignment = (data) => api.post('/job-assignments', data);

export const updateAssignment = (id, data) => api.put(`/job-assignments/${id}`, data);

export const updateAssignmentStatus = (id, status) =>
  api.put(`/job-assignments/${id}/status`, { status });

export const deleteAssignment = (id) => api.delete(`/job-assignments/${id}`);
