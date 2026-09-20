import { apiClient } from './client';

export const usersApi = {
  list: async () => (await apiClient.get('/users')).data,
};
