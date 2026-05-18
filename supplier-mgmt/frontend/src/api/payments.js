import api from './axiosInstance.js';

export const fetchPayments = (params) => api.get('/payments', { params });

export const fetchPayableInvoices = () => api.get('/payments/payable-invoices');

export const createPayment = (data) => api.post('/payments', data);
