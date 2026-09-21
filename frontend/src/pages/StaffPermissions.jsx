import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { staffApi, rolesApi } from '../api/admin';
import { branchesApi } from '../api/branches';
import { usePermission } from '../hooks/usePermission';
import { Button } from '../components/Button.jsx';

function CreateStaffForm() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', password: '', role_id: '', phone: '' });
  const [error, setError] = useState('');

  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });
  const createMutation = useMutation({
    mutationFn: staffApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setForm({ name: '', email: '', password: '', role_id: '', phone: '' });
    },
  });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createMutation.mutateAsync({ ...form, role_id: Number(form.role_id) });
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create account');
    }
  };

  const roles = rolesQuery.data || [];

  return (
    <form onSubmit={submit} className="card p-4">
      <div className="mb-2 font-semibold text-ink">New Staff Account</div>
      <div className="flex flex-wrap gap-2">
        <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input w-40" />
        <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input w-48" />
        <input required type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input w-36" />
        <select required value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })} className="input w-48">
          <option value="">Select role</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input w-32" />
      </div>
      <button type="submit" className="mt-3 rounded bg-success px-4 py-1.5 text-sm font-semibold text-white">
        Create Account
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}

function EditStaffModal({ user, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone || '',
    role_id: user.role_id,
    branch_id: user.branch_id ?? '',
  });
  const [error, setError] = useState('');

  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });
  const branchesQuery = useQuery({ queryKey: ['branches'], queryFn: branchesApi.list });
  const updateMutation = useMutation({
    mutationFn: (data) => staffApi.update(user.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      onClose();
    },
  });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await updateMutation.mutateAsync({
        name: form.name,
        phone: form.phone || null,
        role_id: Number(form.role_id),
        branch_id: form.branch_id ? Number(form.branch_id) : null,
      });
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save');
    }
  };

  const roles = rolesQuery.data || [];
  const branches = branchesQuery.data || [];

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30">
      <form onSubmit={submit} className="w-[420px] card p-5">
        <div className="mb-3 text-lg font-semibold text-ink">Edit Staff — {user.name}</div>

        <label className="mb-1 block text-xs font-medium text-ink-muted">Name</label>
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input mb-3" />

        <label className="mb-1 block text-xs font-medium text-ink-muted">Phone</label>
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input mb-3" />

        <label className="mb-1 block text-xs font-medium text-ink-muted">Role</label>
        <select required value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })} className="input mb-3">
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        <label className="mb-1 block text-xs font-medium text-ink-muted">Branch</label>
        <select value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })} className="input mb-3">
          <option value="">No home branch</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
        </select>

        {error && <p className="mb-2 text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </div>
  );
}

function PermissionsPanel({ user, onClose }) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState({}); // permission_id -> true|false|null (staged, unsaved)
  const permsQuery = useQuery({ queryKey: ['staff-permissions', user.id], queryFn: () => staffApi.getPermissions(user.id) });

  const saveMutation = useMutation({
    mutationFn: (overrides) => staffApi.setPermissions(user.id, overrides),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-permissions', user.id] });
      setPending({});
    },
  });

  const rows = permsQuery.data || [];
  const grouped = useMemo(() => {
    const g = {};
    for (const r of rows) {
      g[r.module] ??= [];
      g[r.module].push(r);
    }
    return g;
  }, [rows]);

  const currentOverride = (row) => (row.id in pending ? pending[row.id] : row.override);

  const cycle = (row) => {
    const current = currentOverride(row);
    // cycle: follow role -> force allow -> force deny -> follow role
    const next = current === null ? true : current === true ? false : null;
    setPending((prev) => ({ ...prev, [row.id]: next }));
  };

  const save = () => {
    const overrides = Object.entries(pending).map(([permission_id, is_granted]) => ({ permission_id: Number(permission_id), is_granted }));
    saveMutation.mutate(overrides);
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30">
      <div className="max-h-[80vh] w-[600px] overflow-auto card p-5">
        <div className="mb-1 text-lg font-semibold text-ink">Permissions — {user.name}</div>
        <p className="mb-3 text-xs text-ink-muted">
          Click a badge to cycle: <em>Role default</em> → <em>Force allow</em> → <em>Force deny</em> → back to role default.
        </p>

        {Object.entries(grouped).map(([module, perms]) => (
          <div key={module} className="mb-3">
            <div className="mb-1 text-xs font-bold uppercase text-ink-muted">{module}</div>
            <div className="flex flex-col gap-1">
              {perms.map((row) => {
                const override = currentOverride(row);
                const effective = override === null ? row.role_grants : override;
                let badgeLabel = 'Role default';
                let badgeClass = 'bg-gray-100 text-ink-muted';
                if (override === true) { badgeLabel = 'Force allow'; badgeClass = 'bg-green-100 text-success'; }
                if (override === false) { badgeLabel = 'Force deny'; badgeClass = 'bg-red-100 text-red-700'; }

                return (
                  <div key={row.id} className="flex items-center justify-between text-sm">
                    <span className={effective ? 'text-ink' : 'text-ink-muted'}>{row.label}</span>
                    <button onClick={() => cycle(row)} className={`rounded px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
                      {badgeLabel}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-4 flex justify-end gap-2 border-t border-border-soft pt-3">
          <button onClick={onClose} className="rounded bg-gray-100 px-3 py-1.5 text-sm text-ink">Close</button>
          <button onClick={save} disabled={Object.keys(pending).length === 0} className="rounded bg-success px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export function StaffPermissions() {
  const canManageAccounts = usePermission('staff.manage_accounts');
  const canManagePermissions = usePermission('staff.manage_permissions');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [statusEdits, setStatusEdits] = useState({});

  const queryClient = useQueryClient();
  const staffQuery = useQuery({ queryKey: ['staff'], queryFn: staffApi.list });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => staffApi.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
  });

  const staff = staffQuery.data || [];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink">Staff &amp; Permissions</h1>

      {canManageAccounts && <div className="mb-4"><CreateStaffForm /></div>}

      <div className="card">
        <div className="border-b border-border-soft px-4 py-3 font-semibold text-ink">Staff Accounts</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft text-left text-xs uppercase text-ink-muted">
              <th className="px-4 py-2">Name</th><th className="px-4 py-2">Email</th><th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Branch</th><th className="px-4 py-2">Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((u) => (
              <tr key={u.id} className="border-b border-border-soft">
                <td className="px-4 py-2 font-medium text-ink">{u.name}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{u.role_name}</td>
                <td className="px-4 py-2 text-ink-muted">{u.branch_name || '-'}</td>
                <td className="px-4 py-2">
                  {canManageAccounts ? (
                    <select
                      value={u.status}
                      onChange={(e) => statusMutation.mutate({ id: u.id, status: e.target.value })}
                      className="rounded border border-gray-300 px-1 py-0.5 text-xs"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  ) : (
                    <span className="capitalize">{u.status}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {canManageAccounts && (
                      <button title="Edit" onClick={() => setEditing(u)} className="text-ink-muted hover:text-ink">
                        <Pencil size={15} />
                      </button>
                    )}
                    {canManagePermissions && (
                      <button onClick={() => setSelected(u)} className="text-xs font-medium text-gold hover:underline">
                        Permissions
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {staff.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-muted">No staff accounts.</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && <PermissionsPanel user={selected} onClose={() => setSelected(null)} />}
      {editing && <EditStaffModal user={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
