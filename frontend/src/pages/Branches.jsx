import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Search, Edit2, CheckCircle2, Power, Plus } from 'lucide-react';
import { branchesApi } from '../api/branches';
import { usePermission } from '../hooks/usePermission';
import { Button } from '../components/Button.jsx';

const emptyForm = {
  branch_name: '',
  print_name: '',
  gstin: '',
  pan_number: '',
  address_line1: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  support_email: '',
  status: 'active',
};

export function Branches({ hideHeader = false }) {
  const canManage = usePermission('branches.manage');
  const queryClient = useQueryClient();
  const branchesQuery = useQuery({ queryKey: ['branches'], queryFn: branchesApi.list });
  const branches = branchesQuery.data || [];

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['branches'] });

  const createMutation = useMutation({
    mutationFn: branchesApi.create,
    onSuccess: () => {
      invalidate();
      resetForm();
      showSuccess('Branch created successfully!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => branchesApi.update ? branchesApi.update(id, data) : Promise.reject(new Error('Update not implemented')),
    onSuccess: () => {
      invalidate();
      resetForm();
      showSuccess('Branch updated successfully!');
    },
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleEdit = (b) => {
    setEditingId(b.id);
    setForm({
      branch_name: b.branch_name || '',
      print_name: b.print_name || '',
      gstin: b.gstin || '',
      pan_number: b.pan_number || '',
      address_line1: b.address_line1 || '',
      city: b.city || '',
      state: b.state || '',
      pincode: b.pincode || '',
      phone: b.phone || '',
      support_email: b.support_email || '',
      status: b.status || 'active',
    });
    setError('');
  };

  const updateField = (name) => (e) => setForm((prev) => ({ ...prev, [name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId && branchesApi.update) {
        await updateMutation.mutateAsync({ id: editingId, data: form });
      } else {
        await createMutation.mutateAsync(form);
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to save branch');
    }
  };

  const filteredBranches = branches.filter((b) => {
    const queryMatch =
      b.branch_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.phone?.includes(searchQuery) ||
      b.gstin?.toLowerCase().includes(searchQuery.toLowerCase());
    const statusMatch = statusFilter === 'all' || b.status === statusFilter;
    return queryMatch && statusMatch;
  });

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-soft/40 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
              <Building2 className="w-7 h-7 text-indigo-400" />
              Branch Management
            </h1>
            <p className="text-xs text-ink-muted mt-1">Configure company branches, invoice headers, tax details, and locations</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Form */}
        <div className="lg:col-span-4">
          <div className="card p-5 space-y-4 sticky top-6">
            <div className="flex items-center justify-between border-b border-border-soft pb-3">
              <h2 className="font-semibold text-ink text-base flex items-center gap-2">
                {editingId ? <Edit2 className="w-4 h-4 text-cyan-400" /> : <Plus className="w-4 h-4 text-emerald-400" />}
                {editingId ? 'Edit Branch' : 'Create New Branch'}
              </h2>
              {editingId && (
                <button onClick={resetForm} className="text-xs text-ink-muted hover:text-ink underline">
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {error && <div className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded border border-red-800/40">{error}</div>}

              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Branch Name *</label>
                <input
                  required
                  type="text"
                  placeholder="Main Showroom / Warehouse"
                  value={form.branch_name}
                  onChange={updateField('branch_name')}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Print Name (Header) *</label>
                <input
                  required
                  type="text"
                  placeholder="Header title printed on invoice"
                  value={form.print_name}
                  onChange={updateField('print_name')}
                  className="input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-ink-muted block mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="33AAAAA0000A1Z5"
                    value={form.gstin}
                    onChange={updateField('gstin')}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-muted block mb-1">PAN Number</label>
                  <input
                    type="text"
                    placeholder="ABCDE1234F"
                    value={form.pan_number}
                    onChange={updateField('pan_number')}
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-ink-muted block mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={form.phone}
                    onChange={updateField('phone')}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-muted block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="branch@store.com"
                    value={form.support_email}
                    onChange={updateField('support_email')}
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Address *</label>
                <input
                  required
                  type="text"
                  placeholder="Street Address, Area"
                  value={form.address_line1}
                  onChange={updateField('address_line1')}
                  className="input w-full"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-medium text-ink-muted block mb-1">City *</label>
                  <input
                    required
                    type="text"
                    placeholder="City"
                    value={form.city}
                    onChange={updateField('city')}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-muted block mb-1">State *</label>
                  <input
                    required
                    type="text"
                    placeholder="State"
                    value={form.state}
                    onChange={updateField('state')}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-muted block mb-1">Pincode</label>
                  <input
                    type="text"
                    placeholder="600001"
                    value={form.pincode}
                    onChange={updateField('pincode')}
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1.5">Status</label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-ink">
                    <input
                      type="radio"
                      name="branchStatus"
                      checked={form.status === 'active'}
                      onChange={() => setForm((prev) => ({ ...prev, status: 'active' }))}
                      className="form-radio text-emerald-500 focus:ring-emerald-500/20"
                    />
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      Active
                    </span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-ink">
                    <input
                      type="radio"
                      name="branchStatus"
                      checked={form.status === 'inactive'}
                      onChange={() => setForm((prev) => ({ ...prev, status: 'inactive' }))}
                      className="form-radio text-gray-500 focus:ring-gray-500/20"
                    />
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gray-500 inline-block"></span>
                      Inactive
                    </span>
                  </label>
                </div>
              </div>

              {canManage && (
                <div className="pt-2 flex items-center gap-2">
                  <Button type="submit" variant="primary" loading={createMutation.isPending || updateMutation.isPending} className="w-full">
                    {editingId ? 'Update Branch' : 'Save Branch'}
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

        {/* Right Column: Directory Data Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Search branches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 w-full text-xs"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-ink-muted">Filter:</span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md transition ${statusFilter === 'all' ? 'bg-indigo-500/20 text-indigo-300 font-medium' : 'text-ink-muted hover:text-ink'}`}
              >
                All ({branches.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-2.5 py-1 rounded-md transition ${statusFilter === 'active' ? 'bg-emerald-500/20 text-emerald-300 font-medium' : 'text-ink-muted hover:text-ink'}`}
              >
                Active ({branches.filter((b) => b.status === 'active' || b.status !== 'inactive').length})
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-2.5 py-1 rounded-md transition ${statusFilter === 'inactive' ? 'bg-gray-500/20 text-gray-300 font-medium' : 'text-ink-muted hover:text-ink'}`}
              >
                Inactive ({branches.filter((b) => b.status === 'inactive').length})
              </button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-border-soft flex items-center justify-between">
              <h3 className="font-semibold text-ink text-sm">Branches Directory</h3>
              <span className="text-xs text-ink-muted">{filteredBranches.length} record(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-soft bg-surface-subtle/30 text-ink-muted font-medium">
                    <th className="px-4 py-3">Branch Name</th>
                    <th className="px-4 py-3">Print Title</th>
                    <th className="px-4 py-3">City / Address</th>
                    <th className="px-4 py-3">GSTIN / Phone</th>
                    <th className="px-4 py-3">Main</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft/60">
                  {filteredBranches.map((b) => {
                    const isActive = b.status !== 'inactive';
                    return (
                      <tr key={b.id} className="hover:bg-surface-subtle/20 transition">
                        <td className="px-4 py-3 font-medium text-ink">{b.branch_name}</td>
                        <td className="px-4 py-3 text-ink-muted">{b.print_name || '-'}</td>
                        <td className="px-4 py-3 text-ink-muted">
                          {b.city ? `${b.city}, ${b.state || ''}` : b.address_line1 || '-'}
                        </td>
                        <td className="px-4 py-3 text-ink-muted">
                          {b.gstin || b.phone || '-'}
                        </td>
                        <td className="px-4 py-3">
                          {b.is_main_branch ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              Main Branch
                            </span>
                          ) : (
                            <span className="text-ink-muted">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right space-x-1">
                          {canManage && (
                            <button
                              onClick={() => handleEdit(b)}
                              className="p-1 rounded hover:bg-surface-subtle text-ink-muted hover:text-cyan-400 transition"
                              title="Edit Branch"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredBranches.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-ink-muted text-xs">
                        No branches match your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

