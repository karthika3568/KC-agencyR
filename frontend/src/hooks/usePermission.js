import { useAuth } from './useAuth.jsx';

/**
 * Pure helper function to verify if a user has a required permission (or at least one of multiple).
 * Does not use React hooks, safe to use in loops, conditionals, and outside components.
 * 
 * @param {object|null} user - The user object containing .permissions string array
 * @param {string|string[]} code - A permission code or an array of codes (matches if user has at least one)
 * @returns {boolean}
 */
export function hasPermission(user, code) {
  if (!user || !user.permissions || !Array.isArray(user.permissions)) return false;
  if (!code) return false;
  if (Array.isArray(code)) {
    return code.some((c) => user.permissions.includes(c));
  }
  return Boolean(user.permissions.includes(code));
}

/**
 * React hook: reads permissions from current authenticated user context.
 * 
 * @param {string|string[]} code
 * @returns {boolean}
 */
export function usePermission(code) {
  const { user } = useAuth();
  return hasPermission(user, code);
}
