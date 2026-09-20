import { useAuth } from './useAuth.jsx';

/**
 * usePermission('pos.access') -> boolean
 * Reads from the permission list returned by /api/auth/me — never a hardcoded
 * role check. This is a UX nicety only; the server re-checks on every call.
 */
export function usePermission(code) {
  const { user } = useAuth();
  return Boolean(user?.permissions?.includes(code));
}
