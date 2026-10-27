import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { hasPermission } from '../hooks/usePermission';
import { AccessDenied } from './AccessDenied.jsx';

export function ProtectedRoute({ children, perm, targetPath = null }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-ink-muted text-xs gap-2">
        <span className="w-2 h-2 rounded-full bg-[#8244AD] animate-ping" />
        Authenticating session…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Field Sales Executive is explicitly locked out of counter /pos
  if (user?.role === 'Field Sales Executive' && targetPath === '/pos') {
    return <AccessDenied requiredPerm="Counter POS not accessible for Field Sales Executive" />;
  }

  // If a specific permission (or array of permissions) is required, enforce it
  if (perm && !hasPermission(user, perm)) {
    return <AccessDenied requiredPerm={perm} />;
  }

  return children;
}
