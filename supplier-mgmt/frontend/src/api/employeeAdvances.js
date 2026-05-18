import api from './axiosInstance.js';

export const fetchEmployeeAdvances = (params) => api.get('/employee-advances', { params });

export const createEmployeeAdvance = (data) => api.post('/employee-advances', data);

export const updateEmployeeAdvance = (id, data) => api.put(`/employee-advances/${id}`, data);

export const deleteEmployeeAdvance = (id) => api.delete(`/employee-advances/${id}`);

export const fetchEmployeeSalarySummary = (params) =>
  api.get('/employee-advances/salary-summary', { params });

export const processEmployeeSalary = (data) => api.post('/employee-advances/process-salary', data);
