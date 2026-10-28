import { apiClient } from './client';

export const branchesApi = {
  list: async () => (await apiClient.get('/branches')).data,
};
