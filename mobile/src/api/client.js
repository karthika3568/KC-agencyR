import axios from 'axios';
import { API_BASE_URL } from '../config/env';
import { secureStorage } from '../storage/secureStorage';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Fired on a 401 so the navigator can drop back to Login. Set by
// RootNavigator at startup — kept outside React state so a plain axios
// interceptor (no hooks) can reach it.
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

apiClient.interceptors.request.use(async (config) => {
  const token = await secureStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Maps any backend/network failure to one short, user-safe message — never the raw error. */
export function friendlyErrorMessage(error) {
  if (!error.response) {
    if (error.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
    return 'Cannot reach the server. Check your internet connection.';
  }
  const { status, data } = error.response;
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return data?.error || "You don't have permission to do that.";
  if (status === 404) return 'That record could not be found.';
  if (status === 422) return data?.error || (data?.errors ? data.errors.join(', ') : 'Please check the entered details.');
  if (status >= 500) return 'The server ran into a problem. Please try again shortly.';
  return data?.error || 'Something went wrong. Please try again.';
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await secureStorage.clearSession();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);
