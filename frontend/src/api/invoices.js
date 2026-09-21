import { apiClient } from './client';

export const invoicesApi = {
  list: async (status) => (await apiClient.get('/invoices', { params: status ? { status } : {} })).data,
  get: async (id) => (await apiClient.get(`/invoices/${id}`)).data,
  create: async (data) => (await apiClient.post('/invoices', data)).data,
  update: async (id, data) => (await apiClient.put(`/invoices/${id}`, data)).data,
  discard: async (id) => (await apiClient.delete(`/invoices/${id}`)).data,
  complete: async (id, payments) => (await apiClient.post(`/invoices/${id}/complete`, { payments })).data,
  print: async (id) => (await apiClient.get(`/invoices/${id}/print`)).data,
  cancel: async (id, reason) => (await apiClient.post(`/invoices/${id}/cancel`, { reason })).data,
};
