import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, Pencil, Trash2, Upload, X, Plus, RotateCcw } from 'lucide-react';
import { categoriesApi, brandsApi, taxCodesApi, stockUnitsApi, itemsApi, categoryBrandsApi } from '../api/catalog';
import { suppliersApi } from '../api/parties';
import { branchesApi } from '../api/branches';
import { Button } from '../components/Button.jsx';
import { Toast } from '../components/Toast.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { resolveImageUrl } from '../utils/media';
import { Pagination } from '../components/Pagination';
import { handleFormKeyDown } from '../utils/formNavigation';

const emptyForm = {
  item_name: '', category_id: '', brand_id: '', supplier_id: '',
  hsn_code: '', barcode: '', base_unit_id: '', secondary_unit_id: '', tax_code_id: '',
  purchase_price: '', cost_price: '', wholesale_price: '', retail_price: '', mrp: '', min_stock_threshold: '',
  net_srate: '', net_purrate: '', secondary_mrp: '', secondary_net_srate: '', secondary_net_purrate: '',
  is_active: true, opening_stock: '',
};

function toNullableInt(v) {
  return v === '' || v === null || v === undefined ? null : Number(v);
}

// Blank means "no override" — sent as null, never 0, so the backend's
// NET_SRATE/NET_PURRATE fallback to the legacy price columns (or the
// primary-unit rate, for the secondary fields) stays in effect.
function toNullableNumber(v) {
  return v === '' || v === null || v === undefined ? null : Number(v);
}

function ItemFormModal({ item, onClose }) {
  const queryClient = useQueryClient();
  const isEdit = !!item;
  const [form, setForm] = useState(() =>
    item
      ? {
          item_name: item.item_name, category_id: item.category_id ?? '', brand_id: item.brand_id ?? '',
          supplier_id: item.supplier_id ?? '',
          hsn_code: item.hsn_code ?? '', barcode: item.barcode ?? '', base_unit_id: item.base_unit_id ?? '',
          secondary_unit_id: item.secondary_unit_id ?? '', tax_code_id: item.tax_code_id ?? '',
          purchase_price: item.purchase_price, cost_price: item.cost_price, wholesale_price: item.wholesale_price,
          retail_price: item.retail_price, mrp: item.mrp, min_stock_threshold: item.min_stock_threshold,
          net_srate: item.net_srate ?? '', net_purrate: item.net_purrate ?? '',
          secondary_mrp: item.secondary_mrp ?? '', secondary_net_srate: item.secondary_net_srate ?? '',
          secondary_net_purrate: item.secondary_net_purrate ?? '',
          is_active: !!Number(item.is_active), opening_stock: item.opening_stock ?? '',
        }
      : emptyForm
  );
  const [selectedBranches, setSelectedBranches] = useState(item?.branch_ids ?? []);
  const [extraUnits, setExtraUnits] = useState(() =>
    (item?.unit_conversions || [])
      .filter((uc) => uc.unit_id !== item?.secondary_unit_id)
      .map((uc) => ({ unit_id: uc.unit_id, conversion_to_base: uc.conversion_to_base, is_purchase_unit: !!Number(uc.is_purchase_unit), is_sale_unit: !!Number(uc.is_sale_unit) }))
  );
  const [checkedUnitIds, setCheckedUnitIds] = useState(() => {
    const ids = new Set();
    if (item?.base_unit_id) ids.add(item.base_unit_id);
    if (item?.secondary_unit_id) ids.add(item.secondary_unit_id);
    (item?.unit_conversions || []).forEach((uc) => ids.add(uc.unit_id));
    return ids;
  });
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(item?.image ? resolveImageUrl(item.image) : null);
  const fileInputRef = useRef(null);

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const brandsQuery = useQuery({ queryKey: ['brands'], queryFn: brandsApi.list });
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: suppliersApi.list });
  const taxCodesQuery = useQuery({ queryKey: ['tax-codes'], queryFn: taxCodesApi.list });
  const stockUnitsQuery = useQuery({ queryKey: ['stock-units'], queryFn: stockUnitsApi.list });
  const branchesQuery = useQuery({ queryKey: ['branches'], queryFn: branchesApi.list });

  const [allowedBrandIds, setAllowedBrandIds] = useState(null);
  useEffect(() => {
    if (!form.category_id) {
      setAllowedBrandIds(null);
      return;
    }
    categoryBrandsApi.get(form.category_id).then((res) => {
      setAllowedBrandIds(res.brand_ids && res.brand_ids.length > 0 ? res.brand_ids : null);
    });
  }, [form.category_id]);

  const categories = categoriesQuery.data || [];
  const allBrands = brandsQuery.data || [];
  const brands = allowedBrandIds ? allBrands.filter((b) => allowedBrandIds.includes(b.id)) : allBrands;
  const suppliers = suppliersQuery.data || [];
  const taxCodes = taxCodesQuery.data || [];
  const stockUnits = stockUnitsQuery.data || [];
  const branches = branchesQuery.data || [];

  const update = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const toggleBranch = (id) => {
    setSelectedBranches((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  };

  const toggleUnit = (unitId) => {
    setCheckedUnitIds((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
        if (form.base_unit_id === unitId) update('base_unit_id', '');
        if (form.secondary_unit_id === unitId) update('secondary_unit_id', '');
        setExtraUnits((eu) => eu.filter((u) => u.unit_id !== unitId));
      } else {
        next.add(unitId);
      }
      return next;
    });
  };

  const otherCheckedUnits = [...checkedUnitIds].filter((id) => id !== form.base_unit_id && id !== Number(form.secondary_unit_id || 0) && id !== form.secondary_unit_id);

  const createMutation = useMutation({ mutationFn: itemsApi.create });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => itemsApi.update(id, data) });
  const uploadImageMutation = useMutation({ mutationFn: ({ id, file }) => itemsApi.uploadImage(id, file) });
  const removeImageMutation = useMutation({ mutationFn: itemsApi.removeImage });

  const handleImagePick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = async () => {
    setImageFile(null);
    setImagePreview(null);
    if (isEdit && item.image) {
      await removeImageMutation.mutateAsync(item.id);
      queryClient.invalidateQueries({ queryKey: ['items'] });
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    const unitConversions = otherCheckedUnits.map((unitId) => {
      const existing = extraUnits.find((u) => u.unit_id === unitId);
      return {
        unit_id: unitId,
        conversion_to_base: existing?.conversion_to_base ?? 1,
        is_purchase_unit: existing?.is_purchase_unit ?? true,
        is_sale_unit: existing?.is_sale_unit ?? true,
      };
    });

    const payload = {
      ...form,
      category_id: toNullableInt(form.category_id),
      brand_id: toNullableInt(form.brand_id),
      supplier_id: toNullableInt(form.supplier_id),
      base_unit_id: toNullableInt(form.base_unit_id),
      secondary_unit_id: toNullableInt(form.secondary_unit_id),
      tax_code_id: toNullableInt(form.tax_code_id),
      purchase_price: Number(form.purchase_price || 0),
      cost_price: Number(form.cost_price || 0),
      wholesale_price: Number(form.wholesale_price || 0),
      retail_price: Number(form.retail_price || 0),
      mrp: Number(form.mrp || 0),
      net_srate: toNullableNumber(form.net_srate),
      net_purrate: toNullableNumber(form.net_purrate),
      secondary_mrp: toNullableNumber(form.secondary_mrp),
      secondary_net_srate: toNullableNumber(form.secondary_net_srate),
      secondary_net_purrate: toNullableNumber(form.secondary_net_purrate),
      min_stock_threshold: Number(form.min_stock_threshold || 0),
      opening_stock: Number(form.opening_stock || 0),
      is_active: form.is_active ? 1 : 0,
      branch_ids: selectedBranches,
      unit_conversions: unitConversions,
    };

    try {
      let savedId = item?.id;
      if (isEdit) {
        await updateMutation.mutateAsync({ id: item.id, data: payload });
      } else {
        const created = await createMutation.mutateAsync(payload);
        savedId = created.id;
      }
      if (imageFile && savedId) {
        await uploadImageMutation.mutateAsync({ id: savedId, file: imageFile });
      }
      queryClient.invalidateQueries({ queryKey: ['items'] });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.errors?.join(', ') || err?.response?.data?.error || 'Save failed');
    }
  };

  const firstInputRef = useRef(null);

  useEffect(() => {
    firstInputRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4">
      <form onSubmit={submit} onKeyDown={handleFormKeyDown} className="card max-h-[90vh] w-full max-w-3xl overflow-y-auto p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold text-ink">{isEdit ? 'Edit Item' : 'New Item'}</div>
          <button type="button" onClick={onClose} aria-label="Close modal" className="rounded p-1 text-ink-muted hover:bg-page focus:outline-none focus:ring-2 focus:ring-[#6F2DA8] focus:ring-offset-1">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-border-soft bg-page">
            {imagePreview ? <img src={imagePreview} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={28} className="text-ink-muted" />}
          </div>
          <div className="flex flex-col gap-1">
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImagePick} className="hidden" />
            <Button type="button" variant="secondary" size="sm" icon={<Upload size={14} />} onClick={() => fileInputRef.current?.click()}>
              {imagePreview ? 'Change Image' : 'Upload Image'}
            </Button>
            {imagePreview && (
              <button type="button" onClick={handleRemoveImage} className="text-xs font-medium text-danger hover:underline">
                Remove image
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Item name *"><input ref={firstInputRef} required value={form.item_name} onChange={(e) => update('item_name', e.target.value)} className="input" /></Field>
          <Field label="Category">
            <select value={form.category_id} onChange={(e) => update('category_id', e.target.value)} className="input">
              <option value="">--</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Brand">
            <select value={form.brand_id} onChange={(e) => update('brand_id', e.target.value)} className="input">
              <option value="">--</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Supplier">
            <select value={form.supplier_id} onChange={(e) => update('supplier_id', e.target.value)} className="input">
              <option value="">--</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="HSN code"><input value={form.hsn_code} onChange={(e) => update('hsn_code', e.target.value)} className="input" /></Field>
          <Field label="Barcode"><input value={form.barcode} onChange={(e) => update('barcode', e.target.value)} className="input" /></Field>
          <Field label="Tax code (GST%)">
            <select value={form.tax_code_id} onChange={(e) => update('tax_code_id', e.target.value)} className="input">
              <option value="">--</option>
              {taxCodes.map((t) => <option key={t.id} value={t.id}>{t.code} ({t.gst_percent}%)</option>)}
            </select>
          </Field>
          <Field label="Purchase price"><input type="number" step="any" value={form.purchase_price} onChange={(e) => update('purchase_price', e.target.value)} className="input" /></Field>
          <Field label="Cost price"><input type="number" step="any" value={form.cost_price} onChange={(e) => update('cost_price', e.target.value)} className="input" /></Field>
          <Field label="Wholesale price"><input type="number" step="any" value={form.wholesale_price} onChange={(e) => update('wholesale_price', e.target.value)} className="input" /></Field>
          <Field label="Retail price"><input type="number" step="any" value={form.retail_price} onChange={(e) => update('retail_price', e.target.value)} className="input" /></Field>
          <Field label="MRP"><input type="number" step="any" value={form.mrp} onChange={(e) => update('mrp', e.target.value)} className="input" /></Field>
          <Field label="NET SALE RATE"><input type="number" step="any" value={form.net_srate} onChange={(e) => update('net_srate', e.target.value)} className="input" placeholder={form.retail_price || '0.00'} /></Field>
          <Field label="NET PURCHASE RATE"><input type="number" step="any" value={form.net_purrate} onChange={(e) => update('net_purrate', e.target.value)} className="input" placeholder={form.purchase_price || '0.00'} /></Field>
          <Field label="Min stock threshold"><input type="number" step="any" value={form.min_stock_threshold} onChange={(e) => update('min_stock_threshold', e.target.value)} className="input" /></Field>
          <Field label="Opening stock">
            <input type="number" step="any" min="0" value={form.opening_stock} onChange={(e) => update('opening_stock', e.target.value)} className="input" placeholder="0" />
          </Field>
          <Field label="Active?">
            <select value={form.is_active ? '1' : '0'} onChange={(e) => update('is_active', e.target.value === '1')} className="input">
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </Field>
        </div>

        <div className="mt-4">
          <div className="mb-1 text-xs font-medium text-ink-muted">Units — check every unit this item can be billed/purchased in *</div>
          <div className="flex flex-wrap gap-3 rounded-lg border border-border-soft p-3">
            {stockUnits.map((u) => (
              <label key={u.id} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={checkedUnitIds.has(u.id)} onChange={() => toggleUnit(u.id)} />
                {u.name} ({u.short_code})
              </label>
            ))}
          </div>
          {checkedUnitIds.size > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                Primary:
                <select required value={form.base_unit_id} onChange={(e) => update('base_unit_id', Number(e.target.value))} className="input w-32">
                  <option value="">--</option>
                  {[...checkedUnitIds].map((id) => (
                    <option key={id} value={id}>{stockUnits.find((u) => u.id === id)?.short_code}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1.5">
                Secondary:
                <select value={form.secondary_unit_id} onChange={(e) => update('secondary_unit_id', e.target.value ? Number(e.target.value) : '')} className="input w-32">
                  <option value="">None</option>
                  {[...checkedUnitIds].filter((id) => id !== form.base_unit_id).map((id) => (
                    <option key={id} value={id}>{stockUnits.find((u) => u.id === id)?.short_code}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {otherCheckedUnits.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              <span className="text-xs text-ink-muted">Conversion to base unit, for each extra unit:</span>
              {otherCheckedUnits.map((unitId) => {
                const existing = extraUnits.find((u) => u.unit_id === unitId) || { conversion_to_base: 1 };
                return (
                  <div key={unitId} className="flex items-center gap-2 text-sm">
                    <span className="w-20">{stockUnits.find((u) => u.id === unitId)?.short_code}</span>
                    <span className="text-ink-muted">1 {stockUnits.find((u) => u.id === unitId)?.short_code} =</span>
                    <input
                      type="number" step="any" value={existing.conversion_to_base}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setExtraUnits((prev) => {
                          const others = prev.filter((u) => u.unit_id !== unitId);
                          return [...others, { ...existing, unit_id: unitId, conversion_to_base: val }];
                        });
                      }}
                      className="input w-20"
                    />
                    <span className="text-ink-muted">base units</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {form.secondary_unit_id && (
          <div className="mt-4">
            <div className="mb-1 text-xs font-medium text-ink-muted">
              Secondary unit pricing ({stockUnits.find((u) => u.id === Number(form.secondary_unit_id))?.short_code || 'S-UNIT'}) —
              used automatically when a sale/purchase line is in this unit instead of the primary unit
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border-soft p-3 sm:grid-cols-3">
              <Field label="S-MRP"><input type="number" step="any" value={form.secondary_mrp} onChange={(e) => update('secondary_mrp', e.target.value)} className="input" placeholder={form.mrp || '0.00'} /></Field>
              <Field label="S-NET_SRATE"><input type="number" step="any" value={form.secondary_net_srate} onChange={(e) => update('secondary_net_srate', e.target.value)} className="input" placeholder={form.net_srate || '0.00'} /></Field>
              <Field label="S-NET_PURRATE"><input type="number" step="any" value={form.secondary_net_purrate} onChange={(e) => update('secondary_net_purrate', e.target.value)} className="input" placeholder={form.net_purrate || '0.00'} /></Field>
            </div>
          </div>
        )}

        <div className="mt-4">
          <div className="mb-1 text-xs font-medium text-ink-muted">Available at branches</div>
          <div className="flex flex-wrap gap-3 rounded-lg border border-border-soft p-3">
            {branches.map((b) => (
              <label key={b.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  data-enter-ignore="true"
                  checked={selectedBranches.includes(b.id)}
                  onChange={() => toggleBranch(b.id)}
                  className="accent-[#6F2DA8] focus:ring-2 focus:ring-[#6F2DA8] rounded"
                />
                {b.branch_name}
              </label>
            ))}
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">{isEdit ? 'Save Changes' : 'Create Item'}</Button>
        </div>
      </form>
    </div>
  );
}

const PAGE_SIZE = 10;

export function ItemsPanel({ canManage }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // active | inactive | all
  const [page, setPage] = useState(1);
  const [modalItem, setModalItem] = useState(undefined); // undefined = closed, null = create, object = edit
  const [importResult, setImportResult] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');
  const [pendingDeactivate, setPendingDeactivate] = useState(null);
  const [deactivateError, setDeactivateError] = useState('');
  const fileInputRef = useRef(null);
  const lastFocusedRef = useRef(null);

  const itemsQuery = useQuery({
    queryKey: ['items', search, statusFilter],
    queryFn: () => itemsApi.list(search, statusFilter),
  });
  const invalidateItems = () => queryClient.invalidateQueries({ queryKey: ['items'] });
  const deleteItem = useMutation({ mutationFn: itemsApi.remove, onSuccess: invalidateItems });
  const reactivateItem = useMutation({
    mutationFn: (id) => itemsApi.update(id, { is_active: 1 }),
    onSuccess: invalidateItems,
  });

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1); // a new search always starts back at page 1
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleDelete = async (item) => {
    setDeactivateError('');
    let usage = null;
    try {
      usage = await itemsApi.usage(item.id);
    } catch {
      // usage lookup is purely informational — never block deactivation on it
    }
    setPendingDeactivate({ item, usage });
  };

  const confirmDeactivate = async () => {
    if (!pendingDeactivate) return;
    try {
      await deleteItem.mutateAsync(pendingDeactivate.item.id);
      setPendingDeactivate(null);
    } catch (err) {
      setDeactivateError(err?.response?.data?.error || 'Unable to deactivate this item.');
    }
  };

  const handleReactivate = async (item) => {
    await reactivateItem.mutateAsync(item.id);
  };

  const openAdd = () => {
    lastFocusedRef.current = document.activeElement;
    setModalItem(null);
  };

  const openEdit = async (item) => {
    lastFocusedRef.current = document.activeElement;
    const full = await itemsApi.get(item.id);
    setModalItem(full);
  };

  const handleCloseModal = () => {
    setModalItem(undefined);
    setTimeout(() => {
      lastFocusedRef.current?.focus();
    }, 50);
  };

  const handleImportFile = (e) => {
    setImportFile(e.target.files[0] || null);
    setImportResult(null);
  };

  const handlePreview = async () => {
    if (!importFile) return;
    const result = await itemsApi.importPreview(importFile);
    setImportResult(result);
  };

  const handleCommit = async () => {
    if (!importFile) return;
    setImportSuccessMsg('');
    const result = await itemsApi.importCommit(importFile);
    setImportResult(result);
    invalidateItems();
    if (result.invalid_rows === 0 && (result.inserted > 0 || result.updated > 0)) {
      setImportSuccessMsg(`Import successful — ${result.inserted} item(s) added, ${result.updated} updated.`);
      setTimeout(() => setImportSuccessMsg(''), 4000);
    }
  };

  const items = itemsQuery.data || [];
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-2.5">
      <Toast message={importSuccessMsg} onClose={() => setImportSuccessMsg('')} />
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-soft px-3.5 py-2">
          <span className="font-semibold text-ink text-sm sm:text-base">Items</span>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-border-soft text-xs">
              {[
                ['active', 'Active'],
                ['inactive', 'Deactivated'],
                ['all', 'All'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  data-catalog-nav="true"
                  onClick={() => handleStatusFilterChange(value)}
                  className={`px-2.5 py-1 font-medium focus:outline-none focus:ring-2 focus:ring-[#6F2DA8] focus:ring-offset-1 ${
                    statusFilter === value ? 'bg-navbar text-gold' : 'bg-white text-ink-muted hover:bg-page'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              type="text"
              data-catalog-nav="true"
              data-catalog-search="true"
              placeholder="Search name / code / barcode"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input w-48 sm:w-56 focus:outline-none focus:ring-2 focus:ring-[#6F2DA8] focus:ring-offset-1"
            />
            <Button variant="secondary" size="sm" data-catalog-nav="true" onClick={() => itemsApi.downloadExport()}>Export Excel</Button>
            {canManage && (
              <Button size="sm" data-catalog-nav="true" icon={<Plus size={13} />} onClick={openAdd}>Add Item</Button>
            )}
          </div>
        </div>

        <div className="max-h-[calc(100vh-240px)] overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[750px] text-xs">
            <thead className="sticky top-0 bg-page z-10">
              <tr className="border-b border-border-soft text-left uppercase text-ink-muted">
                <th className="px-3 py-1.5"></th>
                <th className="px-3 py-1.5">Code</th>
                <th className="px-3 py-1.5">Name</th>
                <th className="px-3 py-1.5">Category</th>
                <th className="px-3 py-1.5">Unit</th>
                <th className="px-3 py-1.5">MRP</th>
                <th className="px-3 py-1.5">NET_SRATE</th>
                <th className="px-3 py-1.5">NET_PURRATE</th>
                <th className="px-3 py-1.5">Stock</th>
                <th className="px-3 py-1.5">GST%</th>
                <th className="px-3 py-1.5">HSN</th>
                {statusFilter === 'all' && <th className="px-3 py-1.5">Status</th>}
                {canManage && <th className="px-3 py-1.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {pagedItems.map((item) => (
                <tr
                  key={item.id}
                  tabIndex={0}
                  data-catalog-nav="true"
                  data-catalog-row="true"
                  className="border-b border-border-soft hover:bg-page/50 focus:outline-none focus:ring-2 focus:ring-[#6F2DA8]/60 focus:bg-[#EDE8FF]/30 transition-colors"
                >
                  <td className="px-3 py-1">
                    <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded bg-page">
                      {item.image ? (
                        <img
                          src={resolveImageUrl(item.image)}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                        />
                      ) : null}
                      <ImageIcon size={14} className="text-ink-muted" style={{ display: item.image ? 'none' : 'flex' }} />
                    </div>
                  </td>
                  <td className="px-3 py-1 text-ink-muted">{item.item_code}</td>
                  <td className="px-3 py-1 font-medium text-ink">{item.item_name}</td>
                  <td className="px-3 py-1 text-ink-muted">{item.category_name || '—'}</td>
                  <td className="px-3 py-1 text-ink-muted">{item.base_unit_code}</td>
                  <td className="px-3 py-1 text-ink-muted">{item.mrp}</td>
                  <td className="px-3 py-1 text-ink-muted">{item.net_srate ?? item.retail_price}</td>
                  <td className="px-3 py-1 text-ink-muted">{item.net_purrate ?? item.purchase_price}</td>
                  <td className="px-3 py-1 font-medium text-ink">{item.stock ?? item.current_stock ?? item.opening_stock ?? 0}</td>
                  <td className="px-3 py-1 text-ink-muted">{item.gst_percent ?? '—'}</td>
                  <td className="px-3 py-1 text-ink-muted">{item.hsn_code || '—'}</td>
                  {statusFilter === 'all' && (
                    <td className="px-3 py-1">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        Number(item.is_active) ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-danger'
                      }`}>
                        {Number(item.is_active) ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                  )}
                  {canManage && (
                    <td className="px-3 py-1 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          data-catalog-nav="true"
                          data-catalog-action="true"
                          onClick={() => openEdit(item)}
                          title="Edit"
                          className="rounded p-1 text-ink-muted hover:bg-page hover:text-gold focus:outline-none focus:ring-2 focus:ring-[#6F2DA8] focus:ring-offset-1"
                        >
                          <Pencil size={13} />
                        </button>
                        {Number(item.is_active) ? (
                          <button
                            type="button"
                            data-catalog-nav="true"
                            data-catalog-action="true"
                            onClick={() => handleDelete(item)}
                            title="Deactivate"
                            className="rounded p-1 text-ink-muted hover:bg-red-50 hover:text-danger focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            data-catalog-nav="true"
                            data-catalog-action="true"
                            onClick={() => handleReactivate(item)}
                            title="Reactivate"
                            className="rounded p-1 text-ink-muted hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-1"
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={11 + (canManage ? 1 : 0) + (statusFilter === 'all' ? 1 : 0)} className="px-4 py-6 text-center text-ink-muted">No items found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={items.length} onPageChange={setPage} />
      </div>

      {canManage && (
        <div className="card p-4">
          <div className="mb-2 font-semibold text-ink">Bulk Import (Excel)</div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" data-catalog-nav="true" onClick={() => itemsApi.downloadImportTemplate()}>Download Template</Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} data-catalog-nav="true" className="text-sm focus:outline-none focus:ring-2 focus:ring-[#6F2DA8] focus:ring-offset-1 rounded" />
            <Button variant="secondary" size="sm" data-catalog-nav="true" disabled={!importFile} onClick={handlePreview}>Preview</Button>
            <Button size="sm" data-catalog-nav="true" disabled={!importFile || !importResult} onClick={handleCommit}>Commit Import</Button>
          </div>

          {importResult && (
            <div className="mt-3 text-sm">
              <p className="mb-2 text-ink-muted">
                {importResult.total_rows} rows — {importResult.valid_rows} valid, {importResult.invalid_rows} invalid.
                {importResult.committed && ` Inserted ${importResult.inserted}, updated ${importResult.updated}.`}
              </p>
              <div className="max-h-64 overflow-auto rounded border border-border-soft">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-page text-left text-ink-muted">
                      <th className="px-3 py-1.5">Row</th>
                      <th className="px-3 py-1.5">Item</th>
                      <th className="px-3 py-1.5">Opening Stock</th>
                      <th className="px-3 py-1.5">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.rows.map((r) => (
                      <tr key={r.row} className={r.errors.length ? 'bg-red-50' : ''}>
                        <td className="px-3 py-1.5">{r.row}</td>
                        <td className="px-3 py-1.5">{r.item_name}</td>
                        <td className="px-3 py-1.5">{r.opening_stock ?? '—'}</td>
                        <td className="px-3 py-1.5 text-danger">{r.errors.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {modalItem !== undefined && <ItemFormModal item={modalItem} onClose={handleCloseModal} />}

      {pendingDeactivate && (
        <ConfirmDialog
          variant={pendingDeactivate.usage?.in_use ? 'warning' : 'question'}
          title={pendingDeactivate.usage?.in_use ? 'Product Already Used' : 'Deactivate this item?'}
          message={
            pendingDeactivate.usage?.in_use
              ? `"${pendingDeactivate.item.item_name}" is referenced by ${pendingDeactivate.usage.invoice_line_count} invoice line(s) and ${pendingDeactivate.usage.prebooking_line_count} pre-booking line(s). It will be hidden from Billing and new bookings, but all existing history stays intact and unchanged.`
              : `Deactivate "${pendingDeactivate.item.item_name}"? It will be hidden from Billing and the active Items list, but its history is kept.`
          }
          details={deactivateError ? <span className="text-rose-600">{deactivateError}</span> : null}
          confirmLabel="Deactivate"
          loading={deleteItem.isPending}
          onConfirm={confirmDeactivate}
          onCancel={() => setPendingDeactivate(null)}
        />
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
