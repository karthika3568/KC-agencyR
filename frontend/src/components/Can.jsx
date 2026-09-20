import { usePermission } from '../hooks/usePermission';

/**
 * Renders children only if the current user holds `perm`. Does not render at
 * all when missing (not just disabled) per the spec's frontend-enforcement rule.
 */
export function Can({ perm, children }) {
  const allowed = usePermission(perm);
  return allowed ? children : null;
}
