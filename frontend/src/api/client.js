import axios from 'axios';
import { useBranchStore } from '../store/branchStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('pos_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Header branch switcher's selection — only meaningful for a user with
  // branches.switch_context; every backend controller ignores it otherwise.
  // Never overrides a branch_id a specific call already set explicitly.
  const selectedBranchId = useBranchStore.getState().selectedBranchId;
  if (selectedBranchId && !(config.params && 'branch_id' in config.params)) {
    config.params = { ...config.params, branch_id: selectedBranchId };
  }

  return config;
});

/**
 * Resolves request options from either a plain params object or a TanStack Query context.
 * Prevents TanStack Query internals (queryKey, pageParam, meta) from leaking into URL search params
 * while attaching any AbortSignal properly to axios request config for cancellation support.
 */
export function cleanQueryConfig(paramsOrContext) {
  if (!paramsOrContext || typeof paramsOrContext !== 'object') {
    return {};
  }
  if (Array.isArray(paramsOrContext.queryKey)) {
    const config = {};
    if (paramsOrContext.signal) {
      config.signal = paramsOrContext.signal;
    }
    return config;
  }
  const { signal, ...rest } = paramsOrContext;
  const config = { params: rest };
  if (signal) {
    config.signal = signal;
  }
  return config;
}

