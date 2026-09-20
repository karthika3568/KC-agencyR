import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePermission } from '../hooks/usePermission';
import { useBranchStore } from '../store/branchStore';
import { branchesApi } from '../api/branches';

/**
 * Branch switcher — renders ONLY for users with branches.switch_context.
 * Single-branch staff never see this at all (not just hidden/disabled).
 * Switching branch updates branchStore, which apiClient attaches as
 * ?branch_id= on every subsequent request — every backend controller
 * already resolves that param for a switch_context user (section 3).
 */
export function Header() {
  const { user, logout } = useAuth();
  const canSwitch = usePermission('branches.switch_context');
  const queryClient = useQueryClient();
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();

  const branchesQuery = useQuery({ queryKey: ['branches'], queryFn: branchesApi.list, enabled: canSwitch });
  const branches = branchesQuery.data || [];

  // Default to the user's own home branch the first time the list loads.
  useEffect(() => {
    if (canSwitch && branches.length > 0 && selectedBranchId === null) {
      const home = branches.find((b) => b.id === user?.branch_id) || branches[0];
      setSelectedBranchId(home.id);
    }
  }, [canSwitch, branches, selectedBranchId, user?.branch_id, setSelectedBranchId]);

  const handleChange = (e) => {
    setSelectedBranchId(Number(e.target.value));
    // Every screen's data is branch-scoped — refetch all of it under the new branch.
    queryClient.invalidateQueries();
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      {canSwitch && (
        <select value={selectedBranchId ?? ''} onChange={handleChange} className="rounded border border-gray-300 px-2 py-1 text-sm">
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.branch_name}</option>
          ))}
        </select>
      )}
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
