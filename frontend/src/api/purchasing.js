import { apiClient } from './client';

export const purchaseRequestsApi = {
  list: async () => (await apiClient.get('/purchase-requests')).data,
  get: async (id) => (await apiClient.get(`/purchase-requests/${id}`)).data,
  create: async (data) => (await apiClient.post('/purchase-requests', data)).data,
  cancel: async (id) => (await apiClient.post(`/purchase-requests/${id}/cancel`)).data,
};

export const purchasesApi = {
  list: async () => (await apiClient.get('/purchases')).data,
  get: async (id) => (await apiClient.get(`/purchases/${id}`)).data,
  create: async (data) => (await apiClient.post('/purchases', data)).data,
  remove: async (id) => (await apiClient.delete(`/purchases/${id}`)).data,
};

export const supplierPaymentsApi = {
  list: async () => (await apiClient.get('/supplier-payments')).data,
  unpaidGrns: async (supplierId) => (await apiClient.get(`/suppliers/${supplierId}/unpaid-grns`)).data,
  create: async (data) => (await apiClient.post('/supplier-payments', data)).data,
};

export const stockAdjustmentsApi = {
  list: async () => (await apiClient.get('/stock-adjustments')).data,
  create: async (data) => (await apiClient.post('/stock-adjustments', data)).data,
};

export const vanStockApi = {
  issue: async (data) => (await apiClient.post('/van-stock/issue', data)).data,
  returnStock: async (data) => (await apiClient.post('/van-stock/return', data)).data,
  pending: async (employeeId) => (await apiClient.get(`/van-stock/${employeeId}`)).data,
};

export const stockHubApi = {
  list: async (params = {}) => (await apiClient.get('/stock-hub', { params })).data,
  lowStock: async () => (await apiClient.get('/stock-hub/low-stock')).data,
};
