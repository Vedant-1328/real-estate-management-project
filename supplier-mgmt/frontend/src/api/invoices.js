import api from './axiosInstance.js';

export const fetchPendingEod = (params) => api.get('/invoices/pending-eod', { params });

export const fetchInvoices = (params) => api.get('/invoices', { params });

export const fetchInvoice = (id) => api.get(`/invoices/${id}`);

export const createInvoice = (data) => api.post('/invoices', data);

export const updateInvoiceStatus = (id, status) =>
  api.put(`/invoices/${id}/status`, { status });

export const updateInvoice = (id, data) => api.put(`/invoices/${id}`, data);

export const cancelInvoice = (id) => api.delete(`/invoices/${id}`);

/** @deprecated alias for cancelInvoice */
export const deleteInvoice = cancelInvoice;

export const fetchOutstanding = () => api.get('/invoices/outstanding');

export const downloadInvoicePdf = (id) =>
  api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });

export const createPayment = (data) => api.post('/payments', data);
