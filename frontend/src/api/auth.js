import { apiClient } from './client';

export async function login(email, password) {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data;
}

export async function fetchMe(token) {
  const authToken = token || localStorage.getItem('pos_token');
  const { data } = await apiClient.get('/auth/me', authToken ? {
    headers: { Authorization: `Bearer ${authToken}` },
  } : undefined);
  return data;
}
