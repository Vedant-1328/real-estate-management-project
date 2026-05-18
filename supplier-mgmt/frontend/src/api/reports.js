import api from './axiosInstance.js';

export const fetchDailyJobReport = (params) => api.get('/reports/daily-job-report', { params });
export const fetchVehicleReport = (params) => api.get('/reports/vehicle-report', { params });
export const fetchDriverReport = (params) => api.get('/reports/driver-report', { params });
export const fetchCompanyBillingReport = (params) =>
  api.get('/reports/company-billing-report', { params });
export const fetchExpenseReport = (params) => api.get('/reports/expense-report', { params });
export const fetchProfitReport = (params) => api.get('/reports/profit-report', { params });
export const fetchSalaryReport = (params) => api.get('/reports/salary-report', { params });
