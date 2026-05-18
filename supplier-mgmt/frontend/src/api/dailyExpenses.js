import api from './axiosInstance.js';

export const fetchExpenses = (params) => api.get('/daily-expenses', { params });

export const fetchExpense = (id) => api.get(`/daily-expenses/${id}`);

export const createExpense = (data) =>
  api.post('/daily-expenses', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });

export const updateExpense = (id, data) =>
  api.put(`/daily-expenses/${id}`, data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });

export const deleteExpense = (id) => api.delete(`/daily-expenses/${id}`);

export const fetchVehicleExpenseSummary = (params) =>
  api.get('/daily-expenses/summary/by-vehicle', { params });
