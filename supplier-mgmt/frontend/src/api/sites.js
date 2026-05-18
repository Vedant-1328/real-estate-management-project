import api from './axiosInstance.js';

export const fetchSites = (params) => api.get('/sites', { params });

export const createSite = (data) => api.post('/sites', data);

export const updateSite = (id, data) => api.put(`/sites/${id}`, data);

export const deleteSite = (id) => api.delete(`/sites/${id}`);

export const fetchTemporarySites = () => api.get('/sites/temporary');

export const convertTemporarySite = (id, data) =>
  api.put(`/sites/temporary/${id}/convert`, data);
