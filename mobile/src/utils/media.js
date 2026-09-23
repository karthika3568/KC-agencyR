import { API_BASE_URL } from '../config/env';

const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export function resolveImageUrl(path) {
  if (!path) return null;
  if (/^https?:\/\/|^data:/i.test(path)) return path;
  return `${BACKEND_ORIGIN}/${String(path).replace(/^\/+/, '')}`;
}
