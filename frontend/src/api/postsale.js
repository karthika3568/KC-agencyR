import { apiClient, cleanQueryConfig } from './client';

export const salesReturnsApi = {
  list: async (params) => (await apiClient.get('/sales-returns', cleanQueryConfig(params))).data,
  create: async (data) => (await apiClient.post('/sales-returns', data)).data,
  approve: async (id) => (await apiClient.post(`/sales-returns/${id}/approve`)).data,
  reject: async (id) => (await apiClient.post(`/sales-returns/${id}/reject`)).data,
};

export const purchaseReturnsApi = {
  list: async (params) => (await apiClient.get('/purchase-returns', cleanQueryConfig(params))).data,
  create: async (data) => (await apiClient.post('/purchase-returns', data)).data,
};

export const collectionsApi = {
  list: async (params) => (await apiClient.get('/collections', cleanQueryConfig(params))).data,
  pending: async () => (await apiClient.get('/collections/pending')).data,
  unpaidInvoices: async (customerId) => (await apiClient.get(`/customers/${customerId}/unpaid-invoices`)).data,
  create: async (data) => (await apiClient.post('/collections', data)).data,
};

export const cashHandoversApi = {
  list: async (params) => (await apiClient.get('/cash-handovers', cleanQueryConfig(params))).data,
  pending: async () => (await apiClient.get('/cash-handovers/pending')).data,
  submit: async (data) => (await apiClient.post('/cash-handovers', data)).data,
  verify: async (id, verifiedAmount) => (await apiClient.post(`/cash-handovers/${id}/verify`, { verified_amount: verifiedAmount })).data,
};

export const expenseCategoriesApi = {
  list: async (params) => (await apiClient.get('/expense-categories', cleanQueryConfig(params))).data,
  create: async (data) => (await apiClient.post('/expense-categories', data)).data,
};

export const expensesApi = {
  list: async (params) => (await apiClient.get('/expenses', cleanQueryConfig(params))).data,
  create: async (data) => (await apiClient.post('/expenses', data)).data,
  remove: async (id) => (await apiClient.delete(`/expenses/${id}`)).data,
};

export const otherIncomeApi = {
  list: async (params) => (await apiClient.get('/other-income', cleanQueryConfig(params))).data,
  create: async (data) => (await apiClient.post('/other-income', data)).data,
  remove: async (id) => (await apiClient.delete(`/other-income/${id}`)).data,
};

