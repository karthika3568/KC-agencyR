import { useAuth } from './useAuth.jsx';

/**
 * usePermission('pos.access') or usePermission(['orders.create_prebooking', 'orders.create_purchase_indent']) -> boolean
 * Reads from the permission list returned by /api/auth/me.
 */
export function usePermission(code) {
  const { user } = useAuth();
  if (!user || !user.permissions) return false;
  if (Array.isArray(code)) {
    return code.some((c) => user.permissions.includes(c));
  }
  return Boolean(user.permissions.includes(code));
}

