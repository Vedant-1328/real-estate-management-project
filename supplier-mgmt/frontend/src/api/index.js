import api from './axiosInstance.js';

export const healthCheck = () => api.get('/health');

export { loginRequest, refreshSession, logoutRequest } from './auth.js';
export { fetchDashboardSummary } from './dashboard.js';
export { setupAxiosAuth } from './axiosInstance.js';
export { default as api } from './axiosInstance.js';
export { listData, paginatedData } from './helpers.js';
