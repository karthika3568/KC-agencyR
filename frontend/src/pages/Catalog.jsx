import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Tag, CheckCircle2, Power, Edit2, Trash2, Search, Plus
} from 'lucide-react';
import { categoriesApi, brandsApi, productLinesApi, taxCodesApi, stockUnitsApi, categoryBrandsApi } from '../api/catalog';
import { EntityTable } from '../components/EntityTable';
import { Tabs } from '../components/Tabs';
import { Button } from '../components/Button.jsx';
import { usePermission } from '../hooks/usePermission';
import { ItemsPanel } from './ItemsPanel.jsx';

function useEntity(key, api) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: [key], queryFn: api.list });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [key] });
  const create = useMutation({ mutationFn: api.create, onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, data }) => api.update(id, data), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: api.remove, onSuccess: invalidate });

  return { rows: query.data || [], isLoading: query.isLoading, create, update, remove };
}

function CategoriesPanel({ canManage }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['categories'] });

  const createMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      invalidate();
      resetForm();
      showSuccess('Category created successfully!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => categoriesApi.update(id, data),
    onSuccess: () => {
      invalidate();
      resetForm();
      showSuccess('Category updated successfully!');
    },
  });

  const removeMutation = useMutation({
    mutationFn: categoriesApi.remove,
    onSuccess: () => {
      invalidate();
      showSuccess('Category deleted successfully.');
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setIsActive(true);
    setFormError('');
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleEdit = (category) => {
    setEditingId(category.id);
    setName(category.name || '');
    setIsActive(category.is_active === undefined ? true : Boolean(Number(category.is_active)));
    setFormError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Category name is required.');
      return;
    }
    const payload = {
      name: name.trim(),
      is_active: isActive ? 1 : 0,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const categories = query.data || [];

  const filteredCategories = categories.filter((c) => {
    const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const cActive = c.is_active === undefined ? true : Boolean(Number(c.is_active));
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && cActive) ||
      (statusFilter === 'inactive' && !cActive);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* LEFT SIDE: Create / Edit Category Form */}
      <div className="lg:col-span-4">
        <div className="card p-5 border border-border-soft bg-white shadow-xs rounded-2xl sticky top-4">
          <div className="flex items-center justify-between border-b border-border-soft pb-3 mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Tag className="h-5 w-5 text-indigo-600" />
              {editingId ? 'Edit Category' : 'Create New Category'}
            </h2>
            {editingId && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                Editing #{editingId}
              </span>
            )}
          </div>

          {successMsg && (
            <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 size={16} />
              {successMsg}
            </div>
          )}

          {formError && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-800 border border-red-200">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Beverages, Electronics..."
                disabled={!canManage}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Status
              </label>
              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-border-soft">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-800">
                  <input
                    type="radio"
                    name="status"
                    checked={isActive}
                    onChange={() => setIsActive(true)}
                    disabled={!canManage}
                    className="accent-emerald-600 h-4 w-4"
                  />
                  <span className="flex items-center gap-1 text-emerald-700">
                    <Power size={14} /> Active
                  </span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-800">
                  <input
                    type="radio"
                    name="status"
                    checked={!isActive}
                    onChange={() => setIsActive(false)}
                    disabled={!canManage}
                    className="accent-rose-600 h-4 w-4"
                  />
                  <span className="flex items-center gap-1 text-slate-500">
                    <Power size={14} /> Inactive
                  </span>
                </label>
              </div>
            </div>

            {canManage && (
              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 justify-center py-2 text-xs font-bold"
                >
                  {editingId ? 'Update Category' : 'Save Category'}
                </Button>

                {editingId && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={resetForm}
                    className="py-2 text-xs font-bold"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* RIGHT SIDE: Category List (Get Categories Call & Table) */}
      <div className="lg:col-span-8">
        <div className="card border border-border-soft bg-white shadow-xs rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border-soft flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Category Directory</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                  {filteredCategories.length} Total
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-8 py-1 text-xs w-44 sm:w-56"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input py-1 text-xs w-28"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-soft bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Category Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created Date</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {filteredCategories.map((c, index) => {
                  const cActive = c.is_active === undefined ? true : Boolean(Number(c.is_active));
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{c.name}</td>
                      <td className="px-4 py-3">
                        {cActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 border border-slate-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-medium">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right space-x-1">
                          <button
                            onClick={() => handleEdit(c)}
                            className="rounded-lg bg-slate-100 p-1.5 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                            title="Edit Category"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete category "${c.name}"?`)) {
                                removeMutation.mutate(c.id);
                              }
                            }}
                            className="rounded-lg bg-slate-100 p-1.5 text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Delete Category"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filteredCategories.length === 0 && (
                  <tr>
                    <td colSpan={canManage ? 5 : 4} className="px-4 py-8 text-center text-slate-400 font-medium">
                      No categories found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


function BrandsPanel({ canManage }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['brands'], queryFn: brandsApi.list });

  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['brands'] });

  const createMutation = useMutation({
    mutationFn: brandsApi.create,
    onSuccess: () => {
      invalidate();
      resetForm();
      showSuccess('Brand created successfully!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => brandsApi.update(id, data),
    onSuccess: () => {
      invalidate();
      resetForm();
      showSuccess('Brand updated successfully!');
    },
  });

  const removeMutation = useMutation({
    mutationFn: brandsApi.remove,
    onSuccess: () => {
      invalidate();
      showSuccess('Brand deleted successfully.');
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCode('');
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
    setCode(item.code || '');
    setIsActive(item.is_active === undefined ? true : Boolean(Number(item.is_active)));
    setFormError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Brand name is required.');
      return;
    }
    const payload = {
      name: name.trim(),
      code: code.trim(),
      is_active: isActive ? 1 : 0,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const brands = query.data || [];

  const filtered = brands.filter((b) => {
    const matchesSearch =
      b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.code?.toLowerCase().includes(searchQuery.toLowerCase());
    const bActive = b.is_active === undefined ? true : Boolean(Number(b.is_active));
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && bActive) ||
      (statusFilter === 'inactive' && !bActive);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* LEFT FORM */}
      <div className="lg:col-span-4">
        <div className="card p-5 border border-border-soft bg-white shadow-xs rounded-2xl sticky top-4">
          <div className="flex items-center justify-between border-b border-border-soft pb-3 mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Tag className="h-5 w-5 text-indigo-600" />
              {editingId ? 'Edit Brand' : 'Create Brand'}
            </h2>
            {editingId && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                Editing #{editingId}
              </span>
            )}
          </div>

          {successMsg && (
            <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 size={16} />
              {successMsg}
            </div>
          )}

          {formError && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-800 border border-red-200">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Brand Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Nestle, Samsung..."
                disabled={!canManage}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Brand Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g., BR-01"
                disabled={!canManage}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Status
              </label>
              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-border-soft">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-800">
                  <input
                    type="radio"
                    name="brand_status"
                    checked={isActive}
                    onChange={() => setIsActive(true)}
                    disabled={!canManage}
                    className="accent-emerald-600 h-4 w-4"
                  />
                  <span className="flex items-center gap-1 text-emerald-700">
                    <Power size={14} /> Active
                  </span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-800">
                  <input
                    type="radio"
                    name="brand_status"
                    checked={!isActive}
                    onChange={() => setIsActive(false)}
                    disabled={!canManage}
                    className="accent-rose-600 h-4 w-4"
                  />
                  <span className="flex items-center gap-1 text-slate-500">
                    <Power size={14} /> Inactive
                  </span>
                </label>
              </div>
            </div>

            {canManage && (
              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 justify-center py-2 text-xs font-bold"
                >
                  {editingId ? 'Update Brand' : 'Save Brand'}
                </Button>

                {editingId && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={resetForm}
                    className="py-2 text-xs font-bold"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* RIGHT GET DATA TABLE */}
      <div className="lg:col-span-8">
        <div className="card border border-border-soft bg-white shadow-xs rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border-soft flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Brands Directory</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                {filtered.length} Total
              </span>
            </h2>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Search brands..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-8 py-1 text-xs w-44 sm:w-56"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input py-1 text-xs w-28"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-soft bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Brand Name</th>
                  <th className="px-4 py-3">Status</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {filtered.map((b, index) => {
                  const bActive = b.is_active === undefined ? true : Boolean(Number(b.is_active));
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-600">{b.code || '-'}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{b.name}</td>
                      <td className="px-4 py-3">
                        {bActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 border border-slate-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span> Inactive
                          </span>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right space-x-1">
                          <button
                            onClick={() => handleEdit(b)}
                            className="rounded-lg bg-slate-100 p-1.5 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete brand "${b.name}"?`)) removeMutation.mutate(b.id);
                            }}
                            className="rounded-lg bg-slate-100 p-1.5 text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={canManage ? 5 : 4} className="px-4 py-8 text-center text-slate-400 font-medium">
                      No brands found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductLinesPanel({ canManage }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['product-lines'], queryFn: productLinesApi.list });

  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['product-lines'] });

  const createMutation = useMutation({
    mutationFn: productLinesApi.create,
    onSuccess: () => {
      invalidate();
      resetForm();
      showSuccess('Product line created successfully!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => productLinesApi.update(id, data),
    onSuccess: () => {
      invalidate();
      resetForm();
      showSuccess('Product line updated successfully!');
    },
  });

  const removeMutation = useMutation({
    mutationFn: productLinesApi.remove,
    onSuccess: () => {
      invalidate();
      showSuccess('Product line deleted.');
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCode('');
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
    setCode(item.code || '');
    setIsActive(item.is_active === undefined ? true : Boolean(Number(item.is_active)));
    setFormError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Product line name is required.');
      return;
    }
    const payload = {
      name: name.trim(),
      code: code.trim(),
      is_active: isActive ? 1 : 0,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const rows = query.data || [];
  const filtered = rows.filter((r) =>
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* LEFT FORM */}
      <div className="lg:col-span-4">
        <div className="card p-5 border border-border-soft bg-white shadow-xs rounded-2xl sticky top-4">
          <div className="flex items-center justify-between border-b border-border-soft pb-3 mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Tag className="h-5 w-5 text-indigo-600" />
              {editingId ? 'Edit Product Line' : 'Create Product Line'}
            </h2>
          </div>

          {successMsg && (
            <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 size={16} /> {successMsg}
            </div>
          )}

          {formError && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-800 border border-red-200">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Line Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Frozen Foods, FMCG..."
                disabled={!canManage}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Line Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g., PL-01"
                disabled={!canManage}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Status
              </label>
              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-border-soft">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-800">
                  <input
                    type="radio"
                    name="pl_status"
                    checked={isActive}
                    onChange={() => setIsActive(true)}
                    disabled={!canManage}
                    className="accent-emerald-600 h-4 w-4"
                  />
                  <span className="flex items-center gap-1 text-emerald-700"><Power size={14} /> Active</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-800">
                  <input
                    type="radio"
                    name="pl_status"
                    checked={!isActive}
                    onChange={() => setIsActive(false)}
                    disabled={!canManage}
                    className="accent-rose-600 h-4 w-4"
                  />
                  <span className="flex items-center gap-1 text-slate-500"><Power size={14} /> Inactive</span>
                </label>
              </div>
            </div>

            {canManage && (
              <div className="flex items-center gap-2 pt-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 justify-center py-2 text-xs font-bold">
                  {editingId ? 'Update Line' : 'Save Product Line'}
                </Button>
                {editingId && (
                  <Button type="button" variant="secondary" onClick={resetForm} className="py-2 text-xs font-bold">
                    Cancel
                  </Button>
                )}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* RIGHT GET DATA TABLE */}
      <div className="lg:col-span-8">
        <div className="card border border-border-soft bg-white shadow-xs rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border-soft flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Product Lines Directory</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                {filtered.length} Total
              </span>
            </h2>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search lines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-8 py-1 text-xs w-48"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-soft bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Line Name</th>
                  <th className="px-4 py-3">Status</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {filtered.map((r, index) => {
                  const rActive = r.is_active === undefined ? true : Boolean(Number(r.is_active));
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-600">{r.code || '-'}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{r.name}</td>
                      <td className="px-4 py-3">
                        {rActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 border border-slate-200">
                            Inactive
                          </span>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right space-x-1">
                          <button onClick={() => handleEdit(r)} className="rounded-lg bg-slate-100 p-1.5 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => { if (confirm(`Delete "${r.name}"?`)) removeMutation.mutate(r.id); }} className="rounded-lg bg-slate-100 p-1.5 text-slate-700 hover:bg-rose-50 hover:text-rose-600">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={canManage ? 5 : 4} className="px-4 py-8 text-center text-slate-400 font-medium">No product lines found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StockUnitsPanel({ canManage }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['stock-units'], queryFn: stockUnitsApi.list });

  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [isDecimal, setIsDecimal] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['stock-units'] });

  const createMutation = useMutation({
    mutationFn: stockUnitsApi.create,
    onSuccess: () => { invalidate(); resetForm(); showSuccess('Stock unit created!'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => stockUnitsApi.update(id, data),
    onSuccess: () => { invalidate(); resetForm(); showSuccess('Stock unit updated!'); },
  });

  const removeMutation = useMutation({
    mutationFn: stockUnitsApi.remove,
    onSuccess: () => { invalidate(); showSuccess('Stock unit deleted.'); },
  });

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setShortCode('');
    setIsDecimal('0');
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
    setShortCode(item.short_code || '');
    setIsDecimal(String(item.is_decimal ?? '0'));
    setIsActive(item.is_active === undefined ? true : Boolean(Number(item.is_active)));
    setFormError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !shortCode.trim()) {
      setFormError('Name and Short Code are required.');
      return;
    }
    const payload = {
      name: name.trim(),
      short_code: shortCode.trim(),
      is_decimal: Number(isDecimal),
      is_active: isActive ? 1 : 0,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const rows = query.data || [];
  const filtered = rows.filter((r) =>
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.short_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* LEFT FORM */}
      <div className="lg:col-span-4">
        <div className="card p-5 border border-border-soft bg-white shadow-xs rounded-2xl sticky top-4">
          <div className="flex items-center justify-between border-b border-border-soft pb-3 mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Tag className="h-5 w-5 text-indigo-600" />
              {editingId ? 'Edit Stock Unit' : 'Create Stock Unit'}
            </h2>
          </div>

          {successMsg && <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200 flex items-center gap-1.5"><CheckCircle2 size={16} /> {successMsg}</div>}
          {formError && <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-800 border border-red-200">{formError}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Unit Name <span className="text-red-500">*</span>
              </label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Kilogram, Piece, Litre" disabled={!canManage} className="input w-full" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Short Code <span className="text-red-500">*</span>
              </label>
              <input type="text" value={shortCode} onChange={(e) => setShortCode(e.target.value)} placeholder="e.g., KG, PCS, LTR" disabled={!canManage} className="input w-full" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Decimal Quantity?</label>
              <select value={isDecimal} onChange={(e) => setIsDecimal(e.target.value)} disabled={!canManage} className="input w-full">
                <option value="0">No (Whole integers only e.g., PCS)</option>
                <option value="1">Yes (Decimal values e.g., 1.5 KG)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Status</label>
              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-border-soft">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-800">
                  <input type="radio" name="su_status" checked={isActive} onChange={() => setIsActive(true)} disabled={!canManage} className="accent-emerald-600 h-4 w-4" />
                  <span className="flex items-center gap-1 text-emerald-700"><Power size={14} /> Active</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-800">
                  <input type="radio" name="su_status" checked={!isActive} onChange={() => setIsActive(false)} disabled={!canManage} className="accent-rose-600 h-4 w-4" />
                  <span className="flex items-center gap-1 text-slate-500"><Power size={14} /> Inactive</span>
                </label>
              </div>
            </div>

            {canManage && (
              <div className="flex items-center gap-2 pt-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 justify-center py-2 text-xs font-bold">
                  {editingId ? 'Update Unit' : 'Save Stock Unit'}
                </Button>
                {editingId && <Button type="button" variant="secondary" onClick={resetForm} className="py-2 text-xs font-bold">Cancel</Button>}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* RIGHT GET DATA TABLE */}
      <div className="lg:col-span-8">
        <div className="card border border-border-soft bg-white shadow-xs rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border-soft flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Stock Units Directory</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">{filtered.length} Total</span>
            </h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" placeholder="Search units..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-8 py-1 text-xs w-48" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-soft bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Unit Name</th>
                  <th className="px-4 py-3">Short Code</th>
                  <th className="px-4 py-3">Decimal?</th>
                  <th className="px-4 py-3">Status</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {filtered.map((r, index) => {
                  const rActive = r.is_active === undefined ? true : Boolean(Number(r.is_active));
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{r.name}</td>
                      <td className="px-4 py-3 font-bold text-indigo-600">{r.short_code}</td>
                      <td className="px-4 py-3 font-semibold text-slate-600">{r.is_decimal ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3">
                        {rActive ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">Active</span> : <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 border border-slate-200">Inactive</span>}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right space-x-1">
                          <button onClick={() => handleEdit(r)} className="rounded-lg bg-slate-100 p-1.5 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"><Edit2 size={14} /></button>
                          <button onClick={() => { if (confirm(`Delete "${r.name}"?`)) removeMutation.mutate(r.id); }} className="rounded-lg bg-slate-100 p-1.5 text-slate-700 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={canManage ? 6 : 5} className="px-4 py-8 text-center text-slate-400 font-medium">No stock units found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaxCodesPanel({ canManage }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['tax-codes'], queryFn: taxCodesApi.list });

  const [editingId, setEditingId] = useState(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [gstPercent, setGstPercent] = useState('');
  const [cgstPercent, setCgstPercent] = useState('');
  const [sgstPercent, setSgstPercent] = useState('');
  const [igstPercent, setIgstPercent] = useState('');
  const [cessPercent, setCessPercent] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tax-codes'] });

  const createMutation = useMutation({
    mutationFn: taxCodesApi.create,
    onSuccess: () => { invalidate(); resetForm(); showSuccess('Tax code created!'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => taxCodesApi.update(id, data),
    onSuccess: () => { invalidate(); resetForm(); showSuccess('Tax code updated!'); },
  });

  const removeMutation = useMutation({
    mutationFn: taxCodesApi.remove,
    onSuccess: () => { invalidate(); showSuccess('Tax code deleted.'); },
  });

  const resetForm = () => {
    setEditingId(null);
    setCode('');
    setName('');
    setGstPercent('');
    setCgstPercent('');
    setSgstPercent('');
    setIgstPercent('');
    setCessPercent('');
    setIsActive(true);
    setFormError('');
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setCode(item.code || '');
    setName(item.name || '');
    setGstPercent(item.gst_percent ?? '');
    setCgstPercent(item.cgst_percent ?? '');
    setSgstPercent(item.sgst_percent ?? '');
    setIgstPercent(item.igst_percent ?? '');
    setCessPercent(item.cess_percent ?? '');
    setIsActive(item.is_active === undefined ? true : Boolean(Number(item.is_active)));
    setFormError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || gstPercent === '') {
      setFormError('Code, Name, and GST % are required.');
      return;
    }
    const payload = {
      code: code.trim(),
      name: name.trim(),
      gst_percent: Number(gstPercent),
      cgst_percent: cgstPercent !== '' ? Number(cgstPercent) : Number(gstPercent) / 2,
      sgst_percent: sgstPercent !== '' ? Number(sgstPercent) : Number(gstPercent) / 2,
      igst_percent: igstPercent !== '' ? Number(igstPercent) : Number(gstPercent),
      cess_percent: cessPercent !== '' ? Number(cessPercent) : 0,
      is_active: isActive ? 1 : 0,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const rows = query.data || [];
  const filtered = rows.filter((r) =>
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* LEFT FORM */}
      <div className="lg:col-span-4">
        <div className="card p-5 border border-border-soft bg-white shadow-xs rounded-2xl sticky top-4">
          <div className="flex items-center justify-between border-b border-border-soft pb-3 mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Tag className="h-5 w-5 text-indigo-600" />
              {editingId ? 'Edit Tax Code (GST)' : 'Create Tax Code (GST)'}
            </h2>
          </div>

          {successMsg && <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200 flex items-center gap-1.5"><CheckCircle2 size={16} /> {successMsg}</div>}
          {formError && <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-800 border border-red-200">{formError}</div>}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Code <span className="text-red-500">*</span></label>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g., GST18" disabled={!canManage} className="input w-full" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., GST 18% Standard" disabled={!canManage} className="input w-full" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">GST % <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} placeholder="e.g., 18" disabled={!canManage} className="input w-full" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">CGST %</label>
                <input type="number" step="0.01" value={cgstPercent} onChange={(e) => setCgstPercent(e.target.value)} placeholder="Auto (GST/2)" disabled={!canManage} className="input w-full" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">SGST %</label>
                <input type="number" step="0.01" value={sgstPercent} onChange={(e) => setSgstPercent(e.target.value)} placeholder="Auto (GST/2)" disabled={!canManage} className="input w-full" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Status</label>
              <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-xl border border-border-soft">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-800">
                  <input type="radio" name="tax_status" checked={isActive} onChange={() => setIsActive(true)} disabled={!canManage} className="accent-emerald-600 h-4 w-4" />
                  <span className="flex items-center gap-1 text-emerald-700"><Power size={14} /> Active</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-800">
                  <input type="radio" name="tax_status" checked={!isActive} onChange={() => setIsActive(false)} disabled={!canManage} className="accent-rose-600 h-4 w-4" />
                  <span className="flex items-center gap-1 text-slate-500"><Power size={14} /> Inactive</span>
                </label>
              </div>
            </div>

            {canManage && (
              <div className="flex items-center gap-2 pt-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 justify-center py-2 text-xs font-bold">
                  {editingId ? 'Update Tax Code' : 'Save Tax Code'}
                </Button>
                {editingId && <Button type="button" variant="secondary" onClick={resetForm} className="py-2 text-xs font-bold">Cancel</Button>}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* RIGHT GET DATA TABLE */}
      <div className="lg:col-span-8">
        <div className="card border border-border-soft bg-white shadow-xs rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border-soft flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Tax Codes Directory</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">{filtered.length} Total</span>
            </h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" placeholder="Search tax codes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-8 py-1 text-xs w-48" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border-soft bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Tax Name</th>
                  <th className="px-4 py-3">GST %</th>
                  <th className="px-4 py-3">CGST / SGST</th>
                  <th className="px-4 py-3">Status</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {filtered.map((r, index) => {
                  const rActive = r.is_active === undefined ? true : Boolean(Number(r.is_active));
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3 font-bold text-indigo-600">{r.code}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{r.name}</td>
                      <td className="px-4 py-3 font-extrabold text-slate-900">{r.gst_percent}%</td>
                      <td className="px-4 py-3 font-medium text-slate-600">{r.cgst_percent}% / {r.sgst_percent}%</td>
                      <td className="px-4 py-3">
                        {rActive ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">Active</span> : <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 border border-slate-200">Inactive</span>}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right space-x-1">
                          <button onClick={() => handleEdit(r)} className="rounded-lg bg-slate-100 p-1.5 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"><Edit2 size={14} /></button>
                          <button onClick={() => { if (confirm(`Delete "${r.name}"?`)) removeMutation.mutate(r.id); }} className="rounded-lg bg-slate-100 p-1.5 text-slate-700 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={canManage ? 7 : 6} className="px-4 py-8 text-center text-slate-400 font-medium">No tax codes found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryBrandMappingPanel() {
  const [categoryId, setCategoryId] = useState('');
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState('');
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const brandsQuery = useQuery({ queryKey: ['brands'], queryFn: brandsApi.list });

  const saveMutation = useMutation({
    mutationFn: () => categoryBrandsApi.set(categoryId, selected),
    onSuccess: () => {
      setMessage('Category-Brand mapping saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    },
  });

  const categories = categoriesQuery.data || [];
  const brands = brandsQuery.data || [];

  const pickCategory = async (id) => {
    setCategoryId(id);
    if (id) {
      const data = await categoryBrandsApi.get(id);
      setSelected(data.brand_ids || []);
    } else {
      setSelected([]);
    }
  };

  const toggle = (brandId) => {
    setSelected((prev) => (prev.includes(brandId) ? prev.filter((b) => b !== brandId) : [...prev, brandId]));
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* LEFT FORM */}
      <div className="lg:col-span-5">
        <div className="card p-5 border border-border-soft bg-white shadow-xs rounded-2xl sticky top-4 space-y-4">
          <div className="border-b border-border-soft pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Tag className="h-5 w-5 text-indigo-600" />
              Assign Brands to Category
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Restrict which brands are allowed under a category. If no brands are selected, all brands are permitted.
            </p>
          </div>

          {message && (
            <div className="rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 size={16} /> {message}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Select Category
            </label>
            <select value={categoryId} onChange={(e) => pickCategory(e.target.value)} className="input w-full">
              <option value="">-- Choose Category --</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {categoryId && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Allowed Brands
                </label>
                <div className="max-h-60 overflow-y-auto space-y-2 p-3 bg-slate-50 rounded-xl border border-border-soft">
                  {brands.map((b) => (
                    <label key={b.id} className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer p-1 rounded-lg hover:bg-white transition-colors">
                      <input type="checkbox" checked={selected.includes(b.id)} onChange={() => toggle(b.id)} className="accent-indigo-600 h-4 w-4 rounded" />
                      <span>{b.name}</span>
                      {b.code && <span className="text-[10px] text-slate-400">({b.code})</span>}
                    </label>
                  ))}
                  {brands.length === 0 && <p className="text-xs text-slate-400">No brands found. Add brands first.</p>}
                </div>
              </div>

              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full justify-center py-2 text-xs font-bold">
                Save Brand Mapping
              </Button>
            </>
          )}
        </div>
      </div>

      {/* RIGHT GET DATA LIST */}
      <div className="lg:col-span-7">
        <div className="card border border-border-soft bg-white shadow-xs rounded-2xl overflow-hidden p-4">
          <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center justify-between">
            <span>Mapped Category Overview</span>
            <span className="text-xs text-slate-500 font-normal">{categories.length} Categories</span>
          </h2>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {categories.map((c) => (
              <div
                key={c.id}
                onClick={() => pickCategory(c.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  String(categoryId) === String(c.id)
                    ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/20'
                    : 'border-border-soft bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{c.name}</span>
                  <span className="text-[11px] font-semibold text-indigo-600 hover:underline">Select &amp; Edit →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Catalog() {
  const canManage = usePermission('catalog.manage_items');

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900 tracking-tight">Catalog Master Management</h1>
      <Tabs
        tabs={[
          { key: 'items', label: 'Items', content: <ItemsPanel canManage={canManage} /> },
          { key: 'categories', label: 'Categories', content: <CategoriesPanel canManage={canManage} /> },
          { key: 'brands', label: 'Brands', content: <BrandsPanel canManage={canManage} /> },
          { key: 'category-brand', label: 'Category ↔ Brand', content: <CategoryBrandMappingPanel /> },
          { key: 'product-lines', label: 'Product Lines', content: <ProductLinesPanel canManage={canManage} /> },
          { key: 'stock-units', label: 'Stock Units', content: <StockUnitsPanel canManage={canManage} /> },
          { key: 'tax-codes', label: 'Tax Codes (GST)', content: <TaxCodesPanel canManage={canManage} /> },
        ]}
      />
    </div>
  );
}


