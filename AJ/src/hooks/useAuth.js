import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../api/auth';
import { secureStorage } from '../storage/secureStorage';
import { setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    await secureStorage.clearSession();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    (async () => {
      const token = await secureStorage.getToken();
      if (token) {
        const cachedUser = await secureStorage.getUser();
        setUser(cachedUser);
        // Re-verify against the backend — permissions may have changed
        // server-side since the token was cached (same trust model as web).
        try {
          const fresh = await authApi.me();
          setUser(fresh);
          await secureStorage.saveSession(token, fresh);
        } catch {
          await logout();
        }
      }
      setLoading(false);
    })();
  }, [logout]);

  const login = async (email, password) => {
    const { token, user: loggedInUser } = await authApi.login(email, password);
    await secureStorage.saveSession(token, loggedInUser);
    setUser(loggedInUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function usePermission(code) {
  const { user } = useAuth();
  return !!user?.permissions?.includes(code);
}
