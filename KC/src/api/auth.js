import { apiClient } from './client';

export const authApi = {
  login: async (email, password) => (await apiClient.post('/auth/login', { email, password })).data,
  me: async () => (await apiClient.get('/auth/me')).data,
};
