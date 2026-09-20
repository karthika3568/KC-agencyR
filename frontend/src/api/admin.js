import { apiClient } from './client';

export const dashboardApi = {
  summary: async () => (await apiClient.get('/dashboard/summary')).data,
};

export const rolesApi = {
  list: async () => (await apiClient.get('/roles')).data,
};

export const permissionsApi = {
  list: async () => (await apiClient.get('/permissions')).data,
};

export const staffApi = {
  list: async () => (await apiClient.get('/users')).data,
  create: async (data) => (await apiClient.post('/users', data)).data,
  update: async (id, data) => (await apiClient.put(`/users/${id}`, data)).data,
  getPermissions: async (id) => (await apiClient.get(`/users/${id}/permissions`)).data,
  setPermissions: async (id, overrides) => (await apiClient.put(`/users/${id}/permissions`, { overrides })).data,
};

export const settingsApi = {
  getBranch: async () => (await apiClient.get('/settings/branch')).data,
  updateBranch: async (data) => (await apiClient.put('/settings/branch', data)).data,
  getPrint: async () => (await apiClient.get('/settings/print')).data,
  updatePrint: async (data) => (await apiClient.put('/settings/print', data)).data,
  getSequences: async () => (await apiClient.get('/settings/sequences')).data,
  updateSequence: async (id, prefix) => (await apiClient.put(`/settings/sequences/${id}`, { prefix })).data,
};

function reportUrl(path, params) {
  const search = new URLSearchParams(params).toString();
  return `/reports/${path}${search ? `?${search}` : ''}`;
}

export const reportsApi = {
  gstRegister: async (params) => (await apiClient.get(reportUrl('gst-register', params))).data,
  nonGstRegister: async (params) => (await apiClient.get(reportUrl('non-gst-register', params))).data,
  purchaseRegister: async (params) => (await apiClient.get(reportUrl('purchase-register', params))).data,
  itemWiseSales: async (params) => (await apiClient.get(reportUrl('item-wise-sales', params))).data,
  creditOutstanding: async () => (await apiClient.get('/reports/credit-outstanding')).data,
  expenseIncome: async (params) => (await apiClient.get(reportUrl('expense-income', params))).data,
  profit: async (params) => (await apiClient.get(reportUrl('profit', params))).data,
  lowStock: async () => (await apiClient.get('/stock-hub/low-stock')).data,

  async downloadExport(path, params) {
    const res = await apiClient.get(reportUrl(path, { ...params, export: 1 }), { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${path}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
