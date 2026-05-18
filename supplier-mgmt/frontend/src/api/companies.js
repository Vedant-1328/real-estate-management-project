import api from './axiosInstance.js';

export const fetchCompanies = (params) => api.get('/companies', { params });

export const fetchCompany = (id) => api.get(`/companies/${id}`);

export const createCompany = (data) => api.post('/companies', data);

export const updateCompany = (id, data) => api.put(`/companies/${id}`, data);

export const deleteCompany = (id) => api.delete(`/companies/${id}`);

export const fetchCompanyRates = (companyId) => api.get(`/companies/${companyId}/rates`);

export const createCompanyRate = (companyId, data) =>
  api.post(`/companies/${companyId}/rates`, data);

export const updateCompanyRate = (companyId, rateId, data) =>
  api.put(`/companies/${companyId}/rates/${rateId}`, data);

export const deleteCompanyRate = (companyId, rateId) =>
  api.delete(`/companies/${companyId}/rates/${rateId}`);
