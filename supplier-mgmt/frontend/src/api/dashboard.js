import api from './axiosInstance.js';

export const fetchDashboardSummary = () => api.get('/dashboard/summary');
