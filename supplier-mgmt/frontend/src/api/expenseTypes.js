import api from './axiosInstance.js';

export const fetchExpenseTypes = () => api.get('/expense-types');

export const createExpenseType = (data) => api.post('/expense-types', data);

export const updateExpenseType = (id, data) => api.put(`/expense-types/${id}`, data);

export const deleteExpenseType = (id) => api.delete(`/expense-types/${id}`);
