import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Truck, MapPin, Building2, CheckCircle2, Power, Edit2, Trash2, Search, Plus, Phone, CreditCard, Tag
} from 'lucide-react';
import { customersApi, suppliersApi } from '../api/parties';
import { isValidPhone, isValidGstin } from '../utils/validators';
import { Tabs } from '../components/Tabs';
import { Button } from '../components/Button.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { useClientPagination } from '../hooks/useClientPagination';
import { usePermission } from '../hooks/usePermission';
import { handleFormKeyDown } from '../utils/formNavigation';

// CUSTOMERS PANEL (Left Form, Right Directory Table)
export function CustomersPanel({ canManage }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['customers'], queryFn: customersApi.list });

  const [editingId, setEditingId] = useState(null);
  const [ledgerName, setLedgerName] = useState('');
  const [phone, setPhone] = useState('');
  const [creditLimit, setCreditLimit] = useState('0');
  const [isLocalCustomer, setIsLocalCustomer] = useState('1');
  const [isActive, setIsActive] = useState(true);
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [pricingType, setPricingType] = useState('normal');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['customers'] });

  const createMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      invalidate();
      resetForm();
      showSuccess('Customer created successfully!');
    },
    onError: (err) => setFormError(err?.response?.data?.error || 'Unable to save customer.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => customersApi.update(id, data),
    onSuccess: () => {
      invalidate();
      resetForm();
      showSuccess('Customer updated successfully!');
    },
    onError: (err) => setFormError(err?.response?.data?.error || 'Unable to save customer.'),
  });

  const removeMutation = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => {
      invalidate();
      showSuccess('Customer deleted.');
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setLedgerName('');
    setPhone('');
    setCreditLimit('0');
    setIsLocalCustomer('1');
    setIsActive(true);
    setGstin('');
    setAddress('');
    setOpeningBalance('0');
    setPricingType('normal');
    setFormError('');
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setLedgerName(item.ledger_name || item.name || '');
    setPhone(item.phone || '');
    setCreditLimit(String(item.credit_limit ?? '0'));
    setIsLocalCustomer(String(item.is_local_customer ?? '1'));
    setIsActive(item.status === 'inactive' || item.is_active === 0 || item.is_active === false ? false : true);
    setGstin(item.gstin || '');
    setAddress(item.address || '');
    setOpeningBalance(String(item.opening_balance ?? '0'));
    setPricingType(item.pricing_type || 'normal');
    setFormError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!ledgerName.trim()) {
      setFormError('Customer name is required.');
      return;
    }
    const trimmedPhone = phone.trim();
    if (trimmedPhone && !isValidPhone(trimmedPhone)) {
      setFormError('Phone number must be a valid 10-digit Indian mobile number.');
      return;
    }
    const trimmedGstin = gstin.trim().toUpperCase();
    if (trimmedGstin && !isValidGstin(trimmedGstin)) {
      setFormError('Invalid GSTIN format. Expected 15 characters, e.g. 27AAPFU0939F1ZV.');
      return;
    }
    const payload = {
      ledger_name: ledgerName.trim(),
      phone: trimmedPhone,
      credit_limit: Number(creditLimit || 0),
      opening_balance: Number(openingBalance || 0),
      is_local_customer: Number(isLocalCustomer ?? 1),
      is_active: isActive ? 1 : 0,
      status: isActive ? 'active' : 'inactive',
      gstin: trimmedGstin || null,
      address: address.trim() || null,
      pricing_type: pricingType,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const rows = query.data || [];

  const filtered = rows.filter((r) => {
    const nameStr = (r.ledger_name || r.name || '').toLowerCase();
    const phoneStr = (r.phone || '').toLowerCase();
    const gstinStr = (r.gstin || '').toLowerCase();
    const matchesSearch = nameStr.includes(searchQuery.toLowerCase()) || phoneStr.includes(searchQuery.toLowerCase()) || gstinStr.includes(searchQuery.toLowerCase());

    const cActive = r.status !== 'inactive' && r.is_active !== 0 && r.is_active !== false;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && cActive) ||
      (statusFilter === 'inactive' && !cActive);
    return matchesSearch && matchesStatus;
  });

  const pagination = useClientPagination(filtered, 10);


  return (
    <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
      {/* LEFT FORM */}
      <div className="lg:col-span-5">
        <div className="card p-3.5 border border-border-soft bg-white shadow-xs rounded-xl lg:sticky lg:top-2">
          <div className="flex items-center justify-between border-b border-border-soft pb-2 mb-2.5">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              {editingId ? 'Edit Customer' : 'Create Customer'}
            </h2>
            {editingId && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                Editing #{editingId}
              </span>
            )}
          </div>

          {successMsg && (
            <div className="mb-2.5 rounded-lg bg-emerald-50 p-2 text-xs font-semibold text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 size={15} /> {successMsg}
            </div>
          )}

          {formError && (
            <div className="mb-2.5 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-800 border border-red-200">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-7">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-0.5">
                  Customer Name / Ledger <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ledgerName}
                  onChange={(e) => setLedgerName(e.target.value)}
                  placeholder="e.g., Sri Ragavendra Traders"
                  disabled={!canManage}
                  className="input w-full"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-0.5">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g., 9876543210"
                  disabled={!canManage}
                  className="input w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-0.5">Credit Limit (Rs.)</label>
                <input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="0"
                  disabled={!canManage}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-0.5">Opening Balance (Rs.)</label>
                <input
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0"
                  disabled={!canManage}
                  className="input w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-0.5">GST No / GSTIN</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="e.g., 33AAAAA0000A1Z5"
                  disabled={!canManage}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-0.5">Pricing Type</label>
                <select value={pricingType} onChange={(e) => setPricingType(e.target.value)} disabled={!canManage} className="input w-full">
                  <option value="normal">Normal</option>
                  <option value="retail">Retail</option>
                  <option value="wholesale">Wholesale</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-7">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-0.5">Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={1}
                  placeholder="Full address"
                  disabled={!canManage}
                  className="input w-full resize-none"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-0.5">Status</label>
                <div className="flex items-center gap-3 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-border-soft h-[33px]">
                  <label className="flex items-center gap-1 text-xs font-bold cursor-pointer text-slate-800">
                    <input
                      type="radio"
                      name="cust_status"
                      checked={isActive}
                      onChange={() => setIsActive(true)}
                      disabled={!canManage}
                      className="accent-emerald-600 h-3.5 w-3.5"
                    />
                    <span className="flex items-center gap-0.5 text-emerald-700 text-[11px]"><Power size={12} /> Active</span>
                  </label>

                  <label className="flex items-center gap-1 text-xs font-bold cursor-pointer text-slate-800">
                    <input
                      type="radio"
                      name="cust_status"
                      checked={!isActive}
                      onChange={() => setIsActive(false)}
                      disabled={!canManage}
                      className="accent-rose-600 h-3.5 w-3.5"
                    />
                    <span className="flex items-center gap-0.5 text-slate-500 text-[11px]"><Power size={12} /> Inactive</span>
                  </label>
                </div>
              </div>
            </div>

            {canManage && (
              <div className="flex items-center gap-2 pt-1">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 justify-center py-1.5 text-xs font-bold">
                  {editingId ? 'Update Customer' : 'Save Customer'}
                </Button>
                {editingId && (
                  <Button type="button" variant="secondary" onClick={resetForm} className="py-1.5 text-xs font-bold">
                    Cancel
                  </Button>
                )}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* RIGHT TABLE */}
      <div className="lg:col-span-7">
        <div className="card border border-border-soft bg-white shadow-xs rounded-xl overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-border-soft flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Customer Directory</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">{filtered.length} Total</span>
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    pagination.resetPage();
                  }}
                  className="input pl-7 py-1 text-xs w-36 sm:w-48"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  pagination.resetPage();
                }}
                className="input py-1 text-xs w-24"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {canManage && (
                <>
                  <Button variant="success" size="sm" onClick={() => customersApi.downloadExport()}>Export</Button>
                  <Button variant="secondary" size="sm" onClick={() => setImportOpen((v) => !v)}>Import</Button>
                </>
              )}
            </div>
          </div>

          {importOpen && (
            <div className="border-b border-border-soft bg-slate-50/60 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="success" size="sm" onClick={() => customersApi.downloadImportTemplate()}>Download Template</Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => { setImportFile(e.target.files[0] || null); setImportResult(null); }}
                  className="text-xs"
                />
                <Button
                  size="sm"
                  disabled={!importFile}
                  onClick={async () => { setImportResult(await customersApi.importPreview(importFile)); }}
                >
                  Preview
                </Button>
                {importResult && !importResult.committed && (
                  <Button
                    size="sm"
                    disabled={importResult.valid_rows === 0}
                    onClick={async () => {
                      const result = await customersApi.importCommit(importFile);
                      setImportResult(result);
                      invalidate();
                      if (result.invalid_rows === 0 && (result.inserted > 0 || result.updated > 0)) {
                        showSuccess(`Import successful — ${result.inserted} added, ${result.updated} updated.`);
                      }
                    }}
                  >
                    Commit Import ({importResult.valid_rows} valid rows)
                  </Button>
                )}
              </div>
              {importResult && (
                <div className="mt-2 text-xs">
                  <div className="font-semibold text-slate-700">
                    Total: {importResult.total_rows} · Valid: {importResult.valid_rows} · Invalid: {importResult.invalid_rows}
                    {importResult.committed && ` · Inserted: ${importResult.inserted} · Updated: ${importResult.updated}`}
                  </div>
                  {importResult.rows.filter((r) => r.errors.length > 0).length > 0 && (
                    <div className="mt-1.5 max-h-36 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-2">
                      {importResult.rows.filter((r) => r.errors.length > 0).map((r) => (
                        <div key={r.row} className="text-red-800 text-[11px]">
                          Row {r.row} ({r.customer || 'unnamed'}): {r.errors.join(', ')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="overflow-x-auto max-h-[calc(100vh-210px)] overflow-y-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="border-b border-border-soft bg-slate-50/95 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Customer Name</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">GSTIN</th>
                  <th className="px-3 py-2">Pricing Type</th>
                  <th className="px-3 py-2">Credit Limit</th>
                  <th className="px-3 py-2">Status</th>
                  {canManage && <th className="px-3 py-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {pagination.pagedItems.map((r, index) => {
                  const cActive = r.status !== 'inactive' && r.is_active !== 0 && r.is_active !== false;
                  const overallIndex = (pagination.page - 1) * 10 + index + 1;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-1.5 font-semibold text-slate-400">{overallIndex}</td>
                      <td className="px-3 py-1.5 font-bold text-slate-900">{r.ledger_name || r.name}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-600">{r.phone || '-'}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-600">{r.gstin || '-'}</td>
                      <td className="px-3 py-1.5">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold capitalize text-slate-700">
                          {r.pricing_type || 'normal'}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 font-bold text-indigo-600">Rs. {Number(r.credit_limit || 0).toLocaleString()}</td>
                      <td className="px-3 py-1.5">
                        {cActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-500 border border-slate-200">
                            Inactive
                          </span>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-3 py-1.5 text-right space-x-1">
                          <button onClick={() => handleEdit(r)} className="rounded-md bg-slate-100 p-1 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"><Edit2 size={13} /></button>
                          <button onClick={() => { if (confirm(`Delete "${r.ledger_name || r.name}"?`)) removeMutation.mutate(r.id); }} className="rounded-md bg-slate-100 p-1 text-slate-700 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={13} /></button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {pagination.total === 0 && (
                  <tr><td colSpan={canManage ? 9 : 8} className="px-3 py-6 text-center text-slate-400 font-medium">No customers found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={pagination.page} pageSize={10} total={pagination.total} onPageChange={pagination.setPage} />
        </div>
      </div>
    </div>
  );
}

// SUPPLIERS PANEL (Left Form, Right Directory Table)
function SuppliersPanel({ canManage }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['suppliers'], queryFn: suppliersApi.list });
  const balancesQuery = useQuery({ queryKey: ['suppliers', 'balances'], queryFn: suppliersApi.balances });

  const balanceById = new Map((balancesQuery.data || []).map((b) => [b.id, b]));

  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [isActive, setIsActive] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['suppliers'] });

  const createMutation = useMutation({
    mutationFn: suppliersApi.create,
    onSuccess: () => { invalidate(); resetForm(); showSuccess('Supplier created successfully!'); },
    onError: (err) => setFormError(err?.response?.data?.error || 'Unable to save supplier.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => suppliersApi.update(id, data),
    onSuccess: () => { invalidate(); resetForm(); showSuccess('Supplier updated successfully!'); },
    onError: (err) => setFormError(err?.response?.data?.error || 'Unable to save supplier.'),
  });

  const removeMutation = useMutation({
    mutationFn: suppliersApi.remove,
    onSuccess: () => { invalidate(); showSuccess('Supplier deleted.'); },
  });

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setGstin('');
    setOpeningBalance('0');
    setIsActive(true);
    setFormError('');
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setName(item.name || '');
    setPhone(item.phone || '');
    setGstin(item.gstin || '');
    setOpeningBalance(String(item.opening_balance ?? '0'));
    setIsActive(item.status === 'inactive' || item.is_active === 0 || item.is_active === false ? false : true);
    setFormError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Supplier name is required.');
      return;
    }
    const trimmedPhone = phone.trim();
    if (trimmedPhone && !isValidPhone(trimmedPhone)) {
      setFormError('Phone number must be a valid 10-digit Indian mobile number.');
      return;
    }
    const trimmedGstin = gstin.trim().toUpperCase();
    if (trimmedGstin && !isValidGstin(trimmedGstin)) {
      setFormError('Invalid GSTIN format. Expected 15 characters, e.g. 27AAPFU0939F1ZV.');
      return;
    }
    const payload = {
      name: name.trim(),
      phone: trimmedPhone,
      gstin: trimmedGstin,
      opening_balance: Number(openingBalance || 0),
      is_active: isActive ? 1 : 0,
      status: isActive ? 'active' : 'inactive',
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const rows = query.data || [];
  const filtered = rows.filter((r) => {
    const matchesSearch = r.name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.gstin?.toLowerCase().includes(searchQuery.toLowerCase()) || r.phone?.toLowerCase().includes(searchQuery.toLowerCase());
    const sActive = r.status !== 'inactive' && r.is_active !== 0 && r.is_active !== false;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && sActive) ||
      (statusFilter === 'inactive' && !sActive);
    return matchesSearch && matchesStatus;
  });

  const pagination = useClientPagination(filtered, 10);


  return (
    <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
      {/* LEFT FORM */}
      <div className="lg:col-span-4">
        <div className="card p-3.5 border border-border-soft bg-white shadow-xs rounded-xl lg:sticky lg:top-2">
          <div className="flex items-center justify-between border-b border-border-soft pb-2 mb-2.5">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Truck className="h-4 w-4 text-indigo-600" />
              {editingId ? 'Edit Supplier' : 'Create Supplier'}
            </h2>
            {editingId && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Editing #{editingId}</span>}
          </div>

          {successMsg && <div className="mb-2.5 rounded-lg bg-emerald-50 p-2 text-xs font-semibold text-emerald-800 border border-emerald-200 flex items-center gap-1.5"><CheckCircle2 size={15} /> {successMsg}</div>}
          {formError && <div className="mb-2.5 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-800 border border-red-200">{formError}</div>}

          <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-0.5">Supplier Name <span className="text-red-500">*</span></label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., HUL Distributors" disabled={!canManage} className="input w-full" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-0.5">Phone Number</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g., 9443322110" disabled={!canManage} className="input w-full" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-0.5">GSTIN Number</label>
                <input type="text" value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="e.g., 33AAAAA0000A1Z5" disabled={!canManage} className="input w-full" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-0.5">Opening Balance (Rs.)</label>
                <input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="0" disabled={!canManage} className="input w-full" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-0.5">Status</label>
                <div className="flex items-center gap-3 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-border-soft h-[33px]">
                  <label className="flex items-center gap-1 text-xs font-bold cursor-pointer text-slate-800">
                    <input type="radio" name="sup_status" checked={isActive} onChange={() => setIsActive(true)} disabled={!canManage} className="accent-emerald-600 h-3.5 w-3.5" />
                    <span className="flex items-center gap-0.5 text-emerald-700 text-[11px]"><Power size={12} /> Active</span>
                  </label>
                  <label className="flex items-center gap-1 text-xs font-bold cursor-pointer text-slate-800">
                    <input type="radio" name="sup_status" checked={!isActive} onChange={() => setIsActive(false)} disabled={!canManage} className="accent-rose-600 h-3.5 w-3.5" />
                    <span className="flex items-center gap-0.5 text-slate-500 text-[11px]"><Power size={12} /> Inactive</span>
                  </label>
                </div>
              </div>
            </div>

            {canManage && (
              <div className="flex items-center gap-2 pt-1">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 justify-center py-1.5 text-xs font-bold">
                  {editingId ? 'Update Supplier' : 'Save Supplier'}
                </Button>
                {editingId && <Button type="button" variant="secondary" onClick={resetForm} className="py-1.5 text-xs font-bold">Cancel</Button>}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* RIGHT TABLE */}
      <div className="lg:col-span-8">
        <div className="card border border-border-soft bg-white shadow-xs rounded-xl overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-border-soft flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Supplier Directory</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">{filtered.length} Total</span>
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    pagination.resetPage();
                  }}
                  className="input pl-7 py-1 text-xs w-36 sm:w-48"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  pagination.resetPage();
                }}
                className="input py-1 text-xs w-24"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[calc(100vh-210px)] overflow-y-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="border-b border-border-soft bg-slate-50/95 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Supplier Name</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">GSTIN</th>
                  <th className="px-3 py-2">Outstanding</th>
                  <th className="px-3 py-2">Status</th>
                  {canManage && <th className="px-3 py-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {pagination.pagedItems.map((r, index) => {
                  const sActive = r.status !== 'inactive' && r.is_active !== 0 && r.is_active !== false;
                  const val = Number(balanceById.get(r.id)?.current_outstanding ?? 0);
                  const overallIndex = (pagination.page - 1) * 10 + index + 1;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-1.5 font-semibold text-slate-400">{overallIndex}</td>
                      <td className="px-3 py-1.5 font-bold text-slate-900">{r.name}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-600">{r.phone || '-'}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-600">{r.gstin || '-'}</td>
                      <td className="px-3 py-1.5 font-bold">
                        <span className={val > 0 ? 'text-rose-600' : 'text-emerald-600'}>Rs. {val.toFixed(2)}</span>
                      </td>
                      <td className="px-3 py-1.5">
                        {sActive ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 border border-emerald-200">Active</span> : <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-500 border border-slate-200">Inactive</span>}
                      </td>
                      {canManage && (
                        <td className="px-3 py-1.5 text-right space-x-1">
                          <button onClick={() => handleEdit(r)} className="rounded-md bg-slate-100 p-1 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"><Edit2 size={13} /></button>
                          <button onClick={() => { if (confirm(`Delete "${r.name}"?`)) removeMutation.mutate(r.id); }} className="rounded-md bg-slate-100 p-1 text-slate-700 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={13} /></button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {pagination.total === 0 && (
                  <tr><td colSpan={canManage ? 7 : 6} className="px-3 py-6 text-center text-slate-400 font-medium">No suppliers found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={pagination.page} pageSize={10} total={pagination.total} onPageChange={pagination.setPage} />
        </div>
      </div>
    </div>
  );
}

export function Parties() {
  const canManageCustomers = usePermission('parties.manage_customers');
  const canManageSuppliers = usePermission('parties.manage_suppliers');

  return (
    <div>
      <h1 className="mb-2 text-xl font-bold text-slate-900 tracking-tight">Parties &amp; Master Management</h1>
      <Tabs
        tabs={[
          { key: 'customers', label: 'Customers', content: <CustomersPanel canManage={canManageCustomers} /> },
          { key: 'suppliers', label: 'Suppliers', content: <SuppliersPanel canManage={canManageSuppliers} /> },
        ]}
      />
    </div>
  );
}

