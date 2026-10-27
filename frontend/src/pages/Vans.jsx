import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Truck, Plus, Search, Edit2, UserCheck, Phone, Mail,
  ShieldCheck, AlertCircle, CheckCircle2, X, Package, ArrowRight
} from 'lucide-react';
import { usersApi } from '../api/users';
import { branchesApi } from '../api/branches';
import { usePermission } from '../hooks/usePermission';
import { useAuth } from '../hooks/useAuth.jsx';
import { Button } from '../components/Button.jsx';
import { Card } from '../components/Card.jsx';
import { Badge } from '../components/Badge.jsx';

export function Vans() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const canManageStaff = usePermission('staff.manage_accounts');
  const canIssueStock = usePermission('inventory.issue_van_stock');

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVan, setEditingVan] = useState(null);
  const [assigningVan, setAssigningVan] = useState(null);

  // Form states for Create / Edit
  const [vanName, setVanName] = useState('');
  const [vanEmail, setVanEmail] = useState('');
  const [vanPhone, setVanPhone] = useState('');
  const [vanPassword, setVanPassword] = useState('');
  const [vanBranchId, setVanBranchId] = useState('');
  const [vanStatus, setVanStatus] = useState('active');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch users & branches
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: usersApi.list });
  const branchesQuery = useQuery({ queryKey: ['branches'], queryFn: branchesApi.list });

  const allUsers = usersQuery.data || [];
  const branches = branchesQuery.data || [];

  // Identify sales vans / executives
  const vans = allUsers.filter((u) => {
    const roleName = (u.role || '').toLowerCase();
    return roleName.includes('sales') || roleName.includes('van') || u.role_id === 4;
  });

  const filteredVans = vans.filter((v) => {
    const q = searchQuery.toLowerCase();
    return (
      (v.name || '').toLowerCase().includes(q) ||
      (v.phone || '').toLowerCase().includes(q) ||
      (v.email || '').toLowerCase().includes(q) ||
      (v.branch_name || '').toLowerCase().includes(q)
    );
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      invalidate();
      setShowCreateModal(false);
      resetForm();
      showSuccess('Van registered successfully!');
    },
    onError: (err) => {
      setFormError(err?.response?.data?.error || 'Failed to create van record');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => usersApi.update(id, data),
    onSuccess: () => {
      invalidate();
      setEditingVan(null);
      setAssigningVan(null);
      resetForm();
      showSuccess('Van details updated successfully!');
    },
    onError: (err) => {
      setFormError(err?.response?.data?.error || 'Failed to update van record');
    },
  });

  const resetForm = () => {
    setVanName('');
    setVanEmail('');
    setVanPhone('');
    setVanPassword('');
    setVanBranchId(branches[0]?.id ? String(branches[0].id) : '');
    setVanStatus('active');
    setFormError('');
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const openCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEdit = (v) => {
    setEditingVan(v);
    setVanName(v.name || '');
    setVanEmail(v.email || '');
    setVanPhone(v.phone || '');
    setVanBranchId(v.branch_id ? String(v.branch_id) : '');
    setVanStatus(v.status || 'active');
    setFormError('');
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    if (!vanName.trim()) return setFormError('Van name / salesman name is required');
    if (!vanEmail.trim()) return setFormError('Email identifier is required');
    if (!vanPassword) return setFormError('Temporary password is required');

    createMutation.mutate({
      name: vanName.trim(),
      email: vanEmail.trim(),
      password: vanPassword,
      phone: vanPhone.trim() || null,
      branch_id: vanBranchId ? Number(vanBranchId) : null,
      role_id: 4, // Field Sales Executive
      status: vanStatus,
    });
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    if (!editingVan) return;
    if (!vanName.trim()) return setFormError('Van name is required');

    const payload = {
      name: vanName.trim(),
      phone: vanPhone.trim() || null,
      status: vanStatus,
    };
    if (vanBranchId) payload.branch_id = Number(vanBranchId);

    updateMutation.mutate({ id: editingVan.id, data: payload });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-soft/40 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#8244AD]" />
            Mobile Vans Management
          </h1>
          <p className="text-[11px] text-ink-muted mt-0.5">
            Active distribution vans, assigned field sales executives, vehicle units, and stock assignments
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageStaff ? (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={openCreate}
              className="rounded-xl font-bold"
            >
              Register New Van
            </Button>
          ) : (
            <span className="text-[11px] text-ink-muted bg-lavender-50 px-2.5 py-1 rounded-lg border border-border-soft">
              Fleet managed by Branch Admin
            </span>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2 shadow-xs">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-border-soft shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Search van by vehicle, salesman name, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border-soft bg-page pl-9 pr-3 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:bg-white focus:border-primary focus:outline-none"
          />
        </div>

        <div className="text-xs font-semibold text-ink-muted">
          Showing <span className="text-ink font-bold">{filteredVans.length}</span> active van unit(s)
        </div>
      </div>

      {/* Van Cards Grid */}
      {usersQuery.isLoading ? (
        <div className="card p-10 text-center text-xs text-ink-muted">Loading van fleet records...</div>
      ) : filteredVans.length === 0 ? (
        <div className="card p-10 text-center space-y-2">
          <Truck size={32} className="mx-auto text-ink-muted/50" />
          <div className="text-sm font-bold text-ink">No Van Units Found</div>
          <p className="text-xs text-ink-muted">
            {searchQuery ? 'No vans matched your search filter.' : 'No mobile sales vans currently registered.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredVans.map((v) => {
            const isSelf = user?.id === v.id;
            const branch = branches.find((b) => b.id === v.branch_id);

            return (
              <div
                key={v.id}
                className={`rounded-2xl border bg-white p-4 shadow-soft transition-all hover:shadow-soft-md flex flex-col justify-between ${
                  isSelf ? 'border-[#8244AD]/40 ring-1 ring-[#8244AD]/20' : 'border-border-soft'
                }`}
              >
                <div>
                  {/* Top: Status & Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8244AD] to-[#511E69] text-white shadow-xs">
                        <Truck size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-ink leading-tight">
                          {v.name}
                        </h3>
                        <span className="text-[10px] text-ink-muted font-medium">
                          Van #{v.id}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={v.status === 'active' ? 'success' : 'danger'}
                        className="text-[10px] font-bold uppercase tracking-wider"
                      >
                        {v.status || 'Active'}
                      </Badge>
                      {isSelf && (
                        <span className="text-[9.5px] font-extrabold text-[#8244AD] bg-[#EDE8FF] px-2 py-0.5 rounded-full">
                          Your Van
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body: Details */}
                  <div className="mt-3.5 space-y-1.5 pt-3 border-t border-border-soft/60 text-xs text-ink-muted">
                    <div className="flex items-center gap-2">
                      <UserCheck size={14} className="text-[#8244AD] shrink-0" />
                      <span className="text-ink font-semibold">{v.name}</span>
                      <span className="text-[10px] text-ink-muted">({v.role || 'Sales Executive'})</span>
                    </div>

                    {v.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-ink-muted shrink-0" />
                        <span className="text-ink">{v.phone}</span>
                      </div>
                    )}

                    {v.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-ink-muted shrink-0" />
                        <span className="text-ink truncate">{v.email}</span>
                      </div>
                    )}

                    {branch && (
                      <div className="text-[11px] text-ink-muted pt-1">
                        Home Branch: <strong className="text-ink">{branch.branch_name}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-3 border-t border-border-soft flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/van-stock?employee_id=${v.id}`)}
                    className="flex-1 rounded-xl text-xs font-bold"
                  >
                    <Package size={13} />
                    <span>View Stock</span>
                  </Button>

                  {canIssueStock && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/van-stock?employee_id=${v.id}&mode=issue`)}
                      className="rounded-xl text-xs font-bold"
                      title="Issue stock to this van"
                    >
                      Issue
                    </Button>
                  )}

                  {canManageStaff && (
                    <button
                      type="button"
                      onClick={() => openEdit(v)}
                      className="rounded-xl p-2 text-ink-muted hover:bg-lavender-50 hover:text-primary transition-colors"
                      title="Edit Van Details"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE VAN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border-soft px-5 py-3.5 bg-[#351442] text-white">
              <div className="flex items-center gap-2">
                <Truck size={18} />
                <h2 className="text-sm font-extrabold text-white">Register New Van</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full p-1 text-white/80 hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-3">
              {formError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-ink block mb-1">Van / Salesman Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Van 03 (Suresh Kumar)"
                  value={vanName}
                  onChange={(e) => setVanName(e.target.value)}
                  className="w-full rounded-xl border border-border-soft bg-white px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">Login Email *</label>
                  <input
                    type="email"
                    placeholder="van3@kcagency.com"
                    value={vanEmail}
                    onChange={(e) => setVanEmail(e.target.value)}
                    className="w-full rounded-xl border border-border-soft bg-white px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={vanPhone}
                    onChange={(e) => setVanPhone(e.target.value)}
                    className="w-full rounded-xl border border-border-soft bg-white px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-ink block mb-1">Password *</label>
                <input
                  type="password"
                  placeholder="Initial login password"
                  value={vanPassword}
                  onChange={(e) => setVanPassword(e.target.value)}
                  className="w-full rounded-xl border border-border-soft bg-white px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">Assigned Branch</label>
                  <select
                    value={vanBranchId}
                    onChange={(e) => setVanBranchId(e.target.value)}
                    className="w-full rounded-xl border border-border-soft bg-white p-2 text-xs text-ink focus:border-primary focus:outline-none"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.branch_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">Status</label>
                  <select
                    value={vanStatus}
                    onChange={(e) => setVanStatus(e.target.value)}
                    className="w-full rounded-xl border border-border-soft bg-white p-2 text-xs text-ink focus:border-primary focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-border-soft">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={createMutation.isPending}
                  className="flex-1 py-2 rounded-xl text-xs font-bold"
                >
                  Save Van
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT VAN MODAL */}
      {editingVan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border-soft px-5 py-3.5 bg-[#351442] text-white">
              <div className="flex items-center gap-2">
                <Edit2 size={16} />
                <h2 className="text-sm font-extrabold text-white">Edit Van Details</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingVan(null)}
                className="rounded-full p-1 text-white/80 hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-5 space-y-3">
              {formError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-ink block mb-1">Van / Salesman Name *</label>
                <input
                  type="text"
                  value={vanName}
                  onChange={(e) => setVanName(e.target.value)}
                  className="w-full rounded-xl border border-border-soft bg-white px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-ink block mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={vanPhone}
                  onChange={(e) => setVanPhone(e.target.value)}
                  className="w-full rounded-xl border border-border-soft bg-white px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">Assigned Branch</label>
                  <select
                    value={vanBranchId}
                    onChange={(e) => setVanBranchId(e.target.value)}
                    className="w-full rounded-xl border border-border-soft bg-white p-2 text-xs text-ink focus:border-primary focus:outline-none"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.branch_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">Status</label>
                  <select
                    value={vanStatus}
                    onChange={(e) => setVanStatus(e.target.value)}
                    className="w-full rounded-xl border border-border-soft bg-white p-2 text-xs text-ink focus:border-primary focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-border-soft">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingVan(null)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={updateMutation.isPending}
                  className="flex-1 py-2 rounded-xl text-xs font-bold"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vans;
