import { apiClient } from '../api/client';

// Uploaded files live under the backend's public/ dir (e.g.
// "uploads/items/xxx.png"), not the frontend's own origin — a bare
// `/${path}` resolves against the Vite dev server and 404s silently.
const BACKEND_ORIGIN = apiClient.defaults.baseURL.replace(/\/api\/?$/, '');

export function resolveImageUrl(path) {
  if (!path) return null;
  if (/^https?:\/\/|^data:/i.test(path)) return path;
  return `${BACKEND_ORIGIN}/${String(path).replace(/^\/+/, '')}`;
}
