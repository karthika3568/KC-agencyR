import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriesApi, brandsApi, productLinesApi, taxCodesApi, stockUnitsApi, itemsApi } from '../api/catalog';

const emptyForm = {
  item_name: '',
  category_id: '',
  brand_id: '',
  product_line_id: '',
  hsn_code: '',
  barcode: '',
  base_unit_id: '',
  tax_code_id: '',
  purchase_price: '',
  cost_price: '',
  wholesale_price: '',
  retail_price: '',
  mrp: '',
  min_stock_threshold: '',
};

function toNullableInt(v) {
  return v === '' ? null : Number(v);
}

export function ItemsPanel({ canManage }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const fileInputRef = useRef(null);

  const itemsQuery = useQuery({ queryKey: ['items', search], queryFn: () => itemsApi.list(search) });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const brandsQuery = useQuery({ queryKey: ['brands'], queryFn: brandsApi.list });
  const productLinesQuery = useQuery({ queryKey: ['product-lines'], queryFn: productLinesApi.list });
  const taxCodesQuery = useQuery({ queryKey: ['tax-codes'], queryFn: taxCodesApi.list });
  const stockUnitsQuery = useQuery({ queryKey: ['stock-units'], queryFn: stockUnitsApi.list });

  const invalidateItems = () => queryClient.invalidateQueries({ queryKey: ['items'] });
  const createItem = useMutation({ mutationFn: itemsApi.create, onSuccess: invalidateItems });
  const deleteItem = useMutation({ mutationFn: itemsApi.remove, onSuccess: invalidateItems });

  const handleChange = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createItem.mutateAsync({
        ...form,
        category_id: toNullableInt(form.category_id),
        brand_id: toNullableInt(form.brand_id),
        product_line_id: toNullableInt(form.product_line_id),
        base_unit_id: toNullableInt(form.base_unit_id),
        tax_code_id: toNullableInt(form.tax_code_id),
        purchase_price: Number(form.purchase_price || 0),
        cost_price: Number(form.cost_price || 0),
        wholesale_price: Number(form.wholesale_price || 0),
        retail_price: Number(form.retail_price || 0),
        mrp: Number(form.mrp || 0),
        min_stock_threshold: Number(form.min_stock_threshold || 0),
      });
      setForm(emptyForm);
    } catch (err) {
      setError(err?.response?.data?.errors?.join(', ') || err?.response?.data?.error || 'Save failed');
    }
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
    const result = await itemsApi.importCommit(importFile);
    setImportResult(result);
    invalidateItems();
  };

  const items = itemsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const brands = brandsQuery.data || [];
  const productLines = productLinesQuery.data || [];
  const taxCodes = taxCodesQuery.data || [];
  const stockUnits = stockUnitsQuery.data || [];

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <span className="font-semibold text-gray-800">Items</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search name / code / barcode"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            />
            <button
              onClick={() => itemsApi.downloadExport()}
              className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Export Excel
            </button>
          </div>
        </div>

        {canManage && (
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 border-b border-gray-100 px-4 py-4 sm:grid-cols-4">
            <Field label="Item name *">
              <input required value={form.item_name} onChange={(e) => handleChange('item_name', e.target.value)} className="input" />
            </Field>
            <Field label="Category">
              <select value={form.category_id} onChange={(e) => handleChange('category_id', e.target.value)} className="input">
                <option value="">--</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Brand">
              <select value={form.brand_id} onChange={(e) => handleChange('brand_id', e.target.value)} className="input">
                <option value="">--</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Product line">
              <select value={form.product_line_id} onChange={(e) => handleChange('product_line_id', e.target.value)} className="input">
                <option value="">--</option>
                {productLines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="HSN code">
              <input value={form.hsn_code} onChange={(e) => handleChange('hsn_code', e.target.value)} className="input" />
            </Field>
            <Field label="Barcode">
              <input value={form.barcode} onChange={(e) => handleChange('barcode', e.target.value)} className="input" />
            </Field>
            <Field label="Base unit *">
              <select required value={form.base_unit_id} onChange={(e) => handleChange('base_unit_id', e.target.value)} className="input">
                <option value="">--</option>
                {stockUnits.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.short_code})</option>)}
              </select>
            </Field>
            <Field label="Tax code">
              <select value={form.tax_code_id} onChange={(e) => handleChange('tax_code_id', e.target.value)} className="input">
                <option value="">--</option>
                {taxCodes.map((t) => <option key={t.id} value={t.id}>{t.code} ({t.gst_percent}%)</option>)}
              </select>
            </Field>
            <Field label="Purchase price">
              <input type="number" step="any" value={form.purchase_price} onChange={(e) => handleChange('purchase_price', e.target.value)} className="input" />
            </Field>
            <Field label="Cost price">
              <input type="number" step="any" value={form.cost_price} onChange={(e) => handleChange('cost_price', e.target.value)} className="input" />
            </Field>
            <Field label="Wholesale price">
              <input type="number" step="any" value={form.wholesale_price} onChange={(e) => handleChange('wholesale_price', e.target.value)} className="input" />
            </Field>
            <Field label="Retail price">
              <input type="number" step="any" value={form.retail_price} onChange={(e) => handleChange('retail_price', e.target.value)} className="input" />
            </Field>
            <Field label="MRP">
              <input type="number" step="any" value={form.mrp} onChange={(e) => handleChange('mrp', e.target.value)} className="input" />
            </Field>
            <Field label="Min stock threshold">
              <input type="number" step="any" value={form.min_stock_threshold} onChange={(e) => handleChange('min_stock_threshold', e.target.value)} className="input" />
            </Field>
            <div className="col-span-full flex items-center gap-3">
              <button type="submit" className="rounded bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">
                Add Item
              </button>
              {error && <span className="text-sm text-red-600">{error}</span>}
            </div>
          </form>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Unit</th>
              <th className="px-4 py-2">MRP</th>
              <th className="px-4 py-2">Retail</th>
              <th className="px-4 py-2">GST%</th>
              {canManage && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-50">
                <td className="px-4 py-2 text-gray-500">{item.item_code}</td>
                <td className="px-4 py-2 font-medium text-gray-800">{item.item_name}</td>
                <td className="px-4 py-2 text-gray-600">{item.category_name || '—'}</td>
                <td className="px-4 py-2 text-gray-600">{item.base_unit_code}</td>
                <td className="px-4 py-2 text-gray-600">{item.mrp}</td>
                <td className="px-4 py-2 text-gray-600">{item.retail_price}</td>
                <td className="px-4 py-2 text-gray-600">{item.gst_percent ?? '—'}</td>
                {canManage && (
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => deleteItem.mutate(item.id)} className="text-xs font-medium text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">No items yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canManage && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-2 font-semibold text-gray-800">Bulk Import (Excel)</div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => itemsApi.downloadImportTemplate()} className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200">
              Download Template
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} className="text-sm" />
            <button onClick={handlePreview} disabled={!importFile} className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50">
              Preview
            </button>
            <button onClick={handleCommit} disabled={!importFile || !importResult} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              Commit Import
            </button>
          </div>

          {importResult && (
            <div className="mt-3 text-sm">
              <p className="mb-2 text-gray-600">
                {importResult.total_rows} rows — {importResult.valid_rows} valid, {importResult.invalid_rows} invalid.
                {importResult.committed && ` Inserted ${importResult.inserted}.`}
              </p>
              <div className="max-h-64 overflow-auto rounded border border-gray-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500">
                      <th className="px-3 py-1.5">Row</th>
                      <th className="px-3 py-1.5">Item</th>
                      <th className="px-3 py-1.5">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.rows.map((r) => (
                      <tr key={r.row} className={r.errors.length ? 'bg-red-50' : ''}>
                        <td className="px-3 py-1.5">{r.row}</td>
                        <td className="px-3 py-1.5">{r.item_name}</td>
                        <td className="px-3 py-1.5 text-red-600">{r.errors.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  );
}
