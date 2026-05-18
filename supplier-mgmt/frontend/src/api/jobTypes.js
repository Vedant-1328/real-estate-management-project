import api from './axiosInstance.js';

export const fetchJobTypes = () => api.get('/job-types');

export const createJobType = (data) => api.post('/job-types', data);

export const updateJobType = (id, data) => api.put(`/job-types/${id}`, data);

export const deleteJobType = (id) => api.delete(`/job-types/${id}`);
