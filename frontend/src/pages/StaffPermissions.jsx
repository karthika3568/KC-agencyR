import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Search, Plus, Edit2, CheckCircle2, UserCheck, Lock, UserX, Loader2, AlertTriangle, Users } from 'lucide-react';
import { staffApi, rolesApi } from '../api/admin';
import { branchesApi } from '../api/branches';
import { usePermission } from '../hooks/usePermission';
import { Button } from '../components/Button.jsx';
import { Pagination } from '../components/Pagination';
import { useClientPagination } from '../hooks/useClientPagination';
import { handleFormKeyDown } from '../utils/formNavigation';

export function StaffPermissions() {
  const canManageAccounts = usePermission('staff.manage_accounts');
  const canManagePermissions = usePermission('staff.manage_permissions');

  const queryClient = useQueryClient();
  const staffQuery = useQuery({ queryKey: ['staff'], queryFn: staffApi.list });
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });
  const branchesQuery = useQuery({ queryKey: ['branches'], queryFn: branchesApi.list });

  const staff = staffQuery.data || [];
  const roles = rolesQuery.data || [];
  const branches = branchesQuery.data || [];

  const [form, setForm] = useState({ name: '', email: '', password: '', role_id: '', branch_id: '', phone: '', status: 'active' });
  const [editingId, setEditingId] = useState(null);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState(null);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['staff'] });

  const createMutation = useMutation({
    mutationFn: staffApi.create,
    onSuccess: () => {
      invalidate();
      resetForm();
      showSuccess('Staff account created successfully!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => staffApi.update(id, data),
    onSuccess: () => {
      invalidate();
      resetForm();
      showSuccess('Staff account updated successfully!');
    },
  });

  const resetForm = () => {
    setForm({ name: '', email: '', password: '', role_id: '', branch_id: '', phone: '', status: 'active' });
    setEditingId(null);
    setError('');
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleEdit = (u) => {
    setEditingId(u.id);
    setForm({
      name: u.name || '',
      email: u.email || '',
      password: '', // Blank unless updating
      role_id: u.role_id ? String(u.role_id) : '',
      branch_id: u.branch_id ? String(u.branch_id) : '',
      phone: u.phone || '',
      status: u.status || 'active',
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim() || !form.role_id) {
      setError('Name, email, and role are required.');
      return;
    }

    try {
      if (editingId) {
        const payload = {
          name: form.name.trim(),
          phone: form.phone || null,
          role_id: Number(form.role_id),
          branch_id: form.branch_id ? Number(form.branch_id) : null,
          status: form.status,
        };
        if (form.password) payload.password = form.password;
        await updateMutation.mutateAsync({ id: editingId, data: payload });
      } else {
        if (!form.password) {
          setError('Password is required for new accounts.');
          return;
        }
        await createMutation.mutateAsync({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role_id: Number(form.role_id),
          branch_id: form.branch_id ? Number(form.branch_id) : null,
          phone: form.phone || null,
          status: form.status,
        });
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save staff account');
    }
  };

  const filteredStaff = staff.filter((u) => {
    const queryMatch =
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone?.includes(searchQuery);
    const statusMatch = statusFilter === 'all' || u.status === statusFilter;
    return queryMatch && statusMatch;
  });

  const {
    page,
    setPage,
    total,
    paginatedItems: pagedStaff,
    resetPage,
  } = useClientPagination(filteredStaff, 10);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-soft/40 pb-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Staff &amp; Permissions
          </h1>
          <p className="text-xs text-ink-muted">Manage user credentials, branch assignments, roles, and granular security overrides</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-3.5 py-2 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
        {/* Left Column Form */}
        <div className="lg:col-span-4">
          <div className="card p-3.5 space-y-2.5 lg:sticky lg:top-3">
            <div className="flex items-center justify-between border-b border-border-soft pb-2">
              <h2 className="font-semibold text-ink text-sm flex items-center gap-1.5">
                {editingId ? <Edit2 className="w-4 h-4 text-cyan-400" /> : <Plus className="w-4 h-4 text-emerald-400" />}
                {editingId ? 'Edit Staff Account' : 'Create Staff Account'}
              </h2>
              {editingId && (
                <button onClick={resetForm} className="text-xs text-ink-muted hover:text-ink underline">
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-2">
              {error && <div className="text-xs text-red-400 bg-red-950/40 p-2 rounded border border-red-800/40">{error}</div>}

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input w-full text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Email Address *</label>
                <input
                  required
                  disabled={Boolean(editingId)}
                  type="email"
                  placeholder="john@store.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input w-full text-slate-900 font-medium disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  {editingId ? 'New Password (leave empty to keep current)' : 'Password *'}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input w-full text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Role *</label>
                  <select
                    required
                    value={form.role_id}
                    onChange={(e) => setForm({ ...form, role_id: e.target.value })}
                    className="input w-full text-slate-900 font-medium"
                  >
                    <option value="">Select Role</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">Branch</label>
                  <select
                    value={form.branch_id}
                    onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                    className="input w-full text-slate-900 font-medium"
                  >
                    <option value="">All / No Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branch_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 9876543210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input w-full text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Status</label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="radio"
                      name="staffStatus"
                      checked={form.status === 'active'}
                      onChange={() => setForm((prev) => ({ ...prev, status: 'active' }))}
                      className="form-radio text-emerald-500 focus:ring-emerald-500/20"
                    />
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                      Active
                    </span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="radio"
                      name="staffStatus"
                      checked={form.status === 'inactive'}
                      onChange={() => setForm((prev) => ({ ...prev, status: 'inactive' }))}
                      className="form-radio text-gray-500 focus:ring-gray-500/20"
                    />
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 inline-block"></span>
                      Inactive
                    </span>
                  </label>
                </div>
              </div>

              {canManageAccounts && (
                <div className="pt-1.5 flex items-center gap-2">
                  <Button type="submit" variant="primary" loading={createMutation.isPending || updateMutation.isPending} className="w-full">
                    {editingId ? 'Update Staff Account' : 'Save Staff Account'}
                  </Button>
                  {editingId && (
                    <Button type="button" variant="secondary" onClick={resetForm}>
                      Reset
                    </Button>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column Table */}
        <div className="lg:col-span-8 space-y-2.5">
          <div className="card p-2.5 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Search staff by name, email, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 w-full text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-ink-muted">Filter:</span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-0.5 rounded transition ${statusFilter === 'all' ? 'bg-indigo-500/20 text-indigo-300 font-medium' : 'text-ink-muted hover:text-ink'}`}
              >
                All ({staff.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-2 py-0.5 rounded transition ${statusFilter === 'active' ? 'bg-emerald-500/20 text-emerald-300 font-medium' : 'text-ink-muted hover:text-ink'}`}
              >
                Active ({staff.filter((s) => s.status === 'active' || s.status !== 'inactive').length})
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-2 py-0.5 rounded transition ${statusFilter === 'inactive' ? 'bg-gray-500/20 text-gray-300 font-medium' : 'text-ink-muted hover:text-ink'}`}
              >
                Inactive ({staff.filter((s) => s.status === 'inactive').length})
              </button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-3.5 py-2 border-b border-border-soft flex items-center justify-between">
              <h3 className="font-semibold text-ink text-xs sm:text-sm">Staff Directory</h3>
              <span className="text-xs text-ink-muted">{filteredStaff.length} member(s)</span>
            </div>
            <div className="max-h-[calc(100vh-230px)] overflow-x-auto overflow-y-auto">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead className="sticky top-0 bg-page z-10 shadow-sm">
                  <tr className="border-b border-border-soft bg-surface-subtle/30 text-ink-muted font-medium">
                    <th className="px-3 py-1.5">Staff Member</th>
                    <th className="px-3 py-1.5">Email / Phone</th>
                    <th className="px-3 py-1.5">Role</th>
                    <th className="px-3 py-1.5">Branch</th>
                    <th className="px-3 py-1.5">Status</th>
                    <th className="px-3 py-1.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft/60">
                  {staffQuery.isLoading && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-ink-muted text-xs">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading staff…
                        </div>
                      </td>
                    </tr>
                  )}
                  {!staffQuery.isLoading && staffQuery.isError && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-xs">
                        <div className="flex flex-col items-center gap-2 text-red-400">
                          <AlertTriangle className="w-5 h-5" />
                          Unable to load staff users. Please try again.
                          <button
                            type="button"
                            onClick={() => staffQuery.refetch()}
                            className="mt-1 px-3 py-1 rounded bg-red-500/10 border border-red-500/30 text-red-300 font-medium hover:bg-red-500/20 transition"
                          >
                            Retry
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {!staffQuery.isLoading && !staffQuery.isError && staff.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-ink-muted text-xs">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="w-5 h-5" />
                          No staff accounts yet — create the first one on the left.
                        </div>
                      </td>
                    </tr>
                  )}
                  {!staffQuery.isLoading && !staffQuery.isError && staff.length > 0 && pagedStaff.map((u) => {
                    const isActive = u.status !== 'inactive';
                    return (
                      <tr key={u.id} className="hover:bg-surface-subtle/20 transition">
                        <td className="px-3 py-1.5 font-medium text-ink">{u.name}</td>
                        <td className="px-3 py-1.5 text-ink-muted">
                          <div>{u.email}</div>
                          {u.phone && <div className="text-[10px] text-ink-muted/70">{u.phone}</div>}
                        </td>
                        <td className="px-3 py-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/15 text-indigo-300 font-medium border border-indigo-500/20">
                            {u.role_name}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-ink-muted">{u.branch_name || 'All Branches'}</td>
                        <td className="px-3 py-1.5">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right space-x-1.5">
                          {canManageAccounts && (
                            <button
                              onClick={() => handleEdit(u)}
                              className="p-1 rounded hover:bg-surface-subtle text-ink-muted hover:text-cyan-400 transition"
                              title="Edit Staff"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canManagePermissions && (
                            <button
                              onClick={() => setSelectedUserForPerms(u)}
                              className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-medium hover:bg-amber-500/20 transition"
                            >
                              Permissions
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!staffQuery.isLoading && !staffQuery.isError && staff.length > 0 && filteredStaff.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-ink-muted text-xs">
                        No staff members found matching search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={10} total={total} onPageChange={setPage} />
          </div>
        </div>
      </div>

      {selectedUserForPerms && <PermissionsPanel user={selectedUserForPerms} onClose={() => setSelectedUserForPerms(null)} />}
    </div>
  );
}

function PermissionsPanel({ user, onClose }) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [savedBanner, setSavedBanner] = useState(false);

  const permsQuery = useQuery({
    queryKey: ['staff-permissions', user.id],
    queryFn: () => staffApi.getPermissions(user.id),
  });

  const saveMutation = useMutation({
    mutationFn: (overrides) => staffApi.setPermissions(user.id, overrides),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-permissions', user.id] });
      setPending({});
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    },
  });

  const rows = permsQuery.data || [];

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.module.toLowerCase().includes(q)
    );
  }, [rows, searchTerm]);

  const grouped = useMemo(() => {
    const g = {};
    for (const r of filteredRows) {
      g[r.module] ??= [];
      g[r.module].push(r);
    }
    return g;
  }, [filteredRows]);

  const currentOverride = (row) => (row.id in pending ? pending[row.id] : row.override);

  const cycle = (row) => {
    const current = currentOverride(row);
    const next = current === null ? true : current === true ? false : null;
    setPending((prev) => ({ ...prev, [row.id]: next }));
  };

  const setModulePermissions = (perms, value) => {
    const updates = {};
    for (const r of perms) {
      updates[r.id] = value;
    }
    setPending((prev) => ({ ...prev, ...updates }));
  };

  const setAllPermissions = (value) => {
    const updates = {};
    for (const r of rows) {
      updates[r.id] = value;
    }
    setPending((prev) => ({ ...prev, ...updates }));
  };

  const save = () => {
    const overrides = Object.entries(pending).map(([permission_id, is_granted]) => ({
      permission_id: Number(permission_id),
      is_granted,
    }));
    saveMutation.mutate(overrides);
  };

  const pendingCount = Object.keys(pending).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden bg-white border border-slate-300 flex flex-col space-y-0 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              <span>Dynamic Permissions &amp; Overrides — {user.name}</span>
            </h3>
            <p className="text-xs text-slate-700 font-medium mt-1">
              Derived from <span className="font-bold text-[#511E69] bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md">{user.role_name}</span>. Click badge or use quick actions to configure module access.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 text-sm font-bold p-1.5 rounded-lg hover:bg-slate-200 transition"
          >
            ✕
          </button>
        </div>

        {/* Success Banner */}
        {savedBanner && (
          <div className="bg-emerald-50 border-b border-emerald-300 text-emerald-900 text-xs px-4 py-2 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Permissions saved to MySQL database successfully. New access policy is now active.</span>
          </div>
        )}

        {/* Toolbar: Search & Global Bulk Actions */}
        <div className="p-3 sm:px-5 border-b border-slate-200 bg-slate-100/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search permissions or modules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs font-bold text-slate-900 placeholder:text-slate-500 focus:border-[#8244AD] focus:outline-none focus:ring-2 focus:ring-[#8244AD]/20 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-800 text-[11px] uppercase font-black mr-1">Global:</span>
            <button
              type="button"
              onClick={() => setAllPermissions(true)}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold transition shadow-2xs"
            >
              Grant All
            </button>
            <button
              type="button"
              onClick={() => setAllPermissions(false)}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-extrabold transition shadow-2xs"
            >
              Deny All
            </button>
            <button
              type="button"
              onClick={() => setAllPermissions(null)}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-200 text-slate-900 border border-slate-300 font-bold transition shadow-2xs"
            >
              Reset to Role Defaults
            </button>
          </div>
        </div>

        {/* Permission List Grouped by Module */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-slate-50/30">
          {permsQuery.isLoading && (
            <div className="py-12 text-center text-xs font-bold text-slate-700 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Loading database permissions…
            </div>
          )}

          {!permsQuery.isLoading && Object.keys(grouped).length === 0 && (
            <div className="py-12 text-center text-xs font-bold text-slate-700">
              No permissions found matching &quot;{searchTerm}&quot;.
            </div>
          )}

          {!permsQuery.isLoading &&
            Object.entries(grouped).map(([module, perms]) => (
              <div key={module} className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="text-xs font-black uppercase tracking-wider text-[#351442] flex items-center gap-2">
                    <span className="text-sm font-black">{module}</span>
                    <span className="text-xs text-slate-600 font-bold lowercase">({perms.length} actions)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setModulePermissions(perms, true)}
                      className="px-2 py-0.5 rounded text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 transition shadow-2xs"
                      title="Grant all permissions in this module"
                    >
                      Allow Module
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setModulePermissions(perms, false)}
                      className="px-2 py-0.5 rounded text-xs font-bold text-rose-800 bg-rose-50 border border-rose-300 hover:bg-rose-100 transition shadow-2xs"
                      title="Deny all permissions in this module"
                    >
                      Deny Module
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setModulePermissions(perms, null)}
                      className="px-2 py-0.5 rounded text-xs font-bold text-slate-800 bg-slate-100 border border-slate-300 hover:bg-slate-200 transition shadow-2xs"
                      title="Reset module to role defaults"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {perms.map((row) => {
                    const override = currentOverride(row);
                    const effective = override === null ? row.role_grants : override;
                    let badgeLabel = 'Role Default';
                    let badgeClass = 'bg-slate-200 text-slate-900 border-slate-400 font-black';
                    if (override === true) {
                      badgeLabel = 'Force Allow';
                      badgeClass = 'bg-emerald-600 text-white border-emerald-700 font-black';
                    }
                    if (override === false) {
                      badgeLabel = 'Force Deny';
                      badgeClass = 'bg-rose-600 text-white border-rose-700 font-black';
                    }

                    return (
                      <div
                        key={row.id}
                        onClick={() => cycle(row)}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-3 transition shadow-2xs ${
                          effective
                            ? 'border-purple-300 bg-purple-50/30 hover:border-[#8244AD] hover:bg-purple-50/50'
                            : 'border-slate-300 bg-slate-50/80 hover:border-slate-400 hover:bg-white'
                        }`}
                        title="Click to toggle: Role Default → Force Allow → Force Deny"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-[13px] font-black text-slate-900 truncate leading-snug">
                            {row.label}
                          </div>
                          <div className="text-[10px] font-mono font-bold text-slate-600 truncate mt-0.5">
                            {row.code}
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-xs border shrink-0 transition-all shadow-2xs ${badgeClass}`}>
                          {badgeLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-2 bg-slate-50/80">
          <div className="text-xs">
            {pendingCount > 0 ? (
              <span className="font-black text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-md">
                {pendingCount} uncommitted change(s)
              </span>
            ) : (
              <span className="font-bold text-slate-700">All changes saved to database</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onClose} className="font-bold text-slate-800 border-slate-300">
              Close
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={save}
              loading={saveMutation.isPending}
              disabled={pendingCount === 0}
              className="font-extrabold"
            >
              {pendingCount > 0 ? `Save Overrides (${pendingCount})` : 'Save Overrides'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

