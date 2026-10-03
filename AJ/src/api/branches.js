import { apiClient } from './client';

export const branchesApi = {
  list: async () => (await apiClient.get('/branches')).data,
  get: async (id) => (await apiClient.get(`/branches/${id}`)).data,
  create: async (data) => (await apiClient.post('/branches', data)).data,
  update: async (id, data) => (await apiClient.put(`/branches/${id}`, data)).data,
};
