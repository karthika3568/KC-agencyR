import { useAuth } from '../hooks/useAuth.jsx';

export function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-800">Dashboard</h1>
      <p className="text-gray-500">
        Welcome, {user?.name}. Your role is <span className="font-medium">{user?.role}</span> with{' '}
        {user?.permissions?.length ?? 0} effective permissions. Dashboard cards ship in a later phase.
      </p>
    </div>
  );
}
