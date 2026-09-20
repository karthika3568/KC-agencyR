import { useAuth } from '../hooks/useAuth.jsx';
import { Can } from './Can.jsx';

/**
 * Branch switcher — renders ONLY for users with branches.switch_context.
 * Single-branch staff never see this at all (not just a disabled control).
 * Phase 1 stub: no branch list endpoint yet, just proves the gating works.
 */
export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      <Can perm="branches.switch_context">
        <select className="rounded border border-gray-300 px-2 py-1 text-sm">
          <option>Main Branch</option>
        </select>
      </Can>
      <div className="ml-auto flex items-center gap-4 text-sm">
        <span className="text-gray-700">
          {user?.name} <span className="text-gray-400">· {user?.role}</span>
        </span>
        <button onClick={logout} className="rounded bg-gray-100 px-3 py-1 font-medium text-gray-700 hover:bg-gray-200">
          Logout
        </button>
      </div>
    </header>
  );
}
