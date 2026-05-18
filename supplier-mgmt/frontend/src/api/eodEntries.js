import api from './axiosInstance.js';

export const fetchPendingEod = () => api.get('/eod-entries/pending');

export const fetchEodEntries = (params) => api.get('/eod-entries', { params });

export const fetchEodEntry = (id) => api.get(`/eod-entries/${id}`);

export const createEodEntry = (data) => api.post('/eod-entries', data);

export const updateEodEntry = (id, data) => api.put(`/eod-entries/${id}`, data);

export const approveEodEntry = (id) => api.put(`/eod-entries/${id}/approve`);

export const deleteEodEntry = (id) => api.delete(`/eod-entries/${id}`);
