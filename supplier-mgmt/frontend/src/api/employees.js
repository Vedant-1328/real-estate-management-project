import api from './axiosInstance.js';

export const fetchEmployees = (params) => api.get('/employees', { params });

export const fetchEmployee = (id) => api.get(`/employees/${id}`);

export const createEmployee = (data) => api.post('/employees', data);

export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);

export const deleteEmployee = (id) => api.delete(`/employees/${id}`);

export const uploadEmployeeDocument = (employeeId, formData) =>
  api.post(`/employees/${employeeId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteEmployeeDocument = (employeeId, docId) =>
  api.delete(`/employees/${employeeId}/documents/${docId}`);
