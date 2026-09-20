import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-ink-muted">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
