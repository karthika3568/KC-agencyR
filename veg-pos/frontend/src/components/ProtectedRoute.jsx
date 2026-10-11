import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import TopNav from './TopNav.jsx';

export default function ProtectedRoute({ children, adminOnly = false, managerUp = false }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  if (managerUp && !['admin', 'manager'].includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
