import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
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
  const { rows, create, update, remove } = useEntity('categories', categoriesApi);
  return (
    <EntityTable
      title="Categories"
      canManage={canManage}
      fields={[{ name: 'name', label: 'Name', required: true }]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'created_at', label: 'Created' },
      ]}
      rows={rows}
      onCreate={(data) => create.mutateAsync(data)}
      onUpdate={(id, data) => update.mutateAsync({ id, data })}
      onDelete={(id) => remove.mutateAsync(id)}
    />
  );
}

function BrandsPanel({ canManage }) {
  const { rows, create, update, remove } = useEntity('brands', brandsApi);
  return (
    <EntityTable
      title="Brands"
      canManage={canManage}
      fields={[{ name: 'name', label: 'Name', required: true }]}
      columns={[
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Name' },
      ]}
      rows={rows}
      onCreate={(data) => create.mutateAsync(data)}
      onUpdate={(id, data) => update.mutateAsync({ id, data })}
      onDelete={(id) => remove.mutateAsync(id)}
    />
  );
}

function ProductLinesPanel({ canManage }) {
  const { rows, create, update, remove } = useEntity('product-lines', productLinesApi);
  return (
    <EntityTable
      title="Product Lines (Profit Centers)"
      canManage={canManage}
      fields={[{ name: 'name', label: 'Name', required: true }]}
      columns={[
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Name' },
      ]}
      rows={rows}
      onCreate={(data) => create.mutateAsync(data)}
      onUpdate={(id, data) => update.mutateAsync({ id, data })}
      onDelete={(id) => remove.mutateAsync(id)}
    />
  );
}

function TaxCodesPanel({ canManage }) {
  const { rows, create, update, remove } = useEntity('tax-codes', taxCodesApi);
  return (
    <EntityTable
      title="Tax Codes (GST slabs)"
      canManage={canManage}
      fields={[
        { name: 'code', label: 'Code', required: true },
        { name: 'name', label: 'Name', required: true },
        { name: 'gst_percent', label: 'GST %', type: 'number', required: true },
        { name: 'cgst_percent', label: 'CGST %', type: 'number' },
        { name: 'sgst_percent', label: 'SGST %', type: 'number' },
        { name: 'igst_percent', label: 'IGST %', type: 'number' },
        { name: 'cess_percent', label: 'Cess %', type: 'number' },
      ]}
      columns={[
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Name' },
        { key: 'gst_percent', label: 'GST %' },
        { key: 'cgst_percent', label: 'CGST %' },
        { key: 'sgst_percent', label: 'SGST %' },
        { key: 'igst_percent', label: 'IGST %' },
      ]}
      rows={rows}
      onCreate={(data) => create.mutateAsync(data)}
      onUpdate={(id, data) => update.mutateAsync({ id, data })}
      onDelete={(id) => remove.mutateAsync(id)}
    />
  );
}

function StockUnitsPanel({ canManage }) {
  const { rows, create, update, remove } = useEntity('stock-units', stockUnitsApi);
  return (
    <EntityTable
      title="Stock Units"
      canManage={canManage}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'short_code', label: 'Short code', required: true },
        {
          name: 'is_decimal',
          label: 'Decimal qty?',
          type: 'select',
          options: [
            { value: '0', label: 'No' },
            { value: '1', label: 'Yes' },
          ],
          default: '0',
        },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'short_code', label: 'Short code' },
        { key: 'is_decimal', label: 'Decimal?', render: (r) => (r.is_decimal ? 'Yes' : 'No') },
      ]}
      rows={rows}
      onCreate={(data) => create.mutateAsync({ ...data, is_decimal: Number(data.is_decimal) })}
      onUpdate={(id, data) => update.mutateAsync({ id, data: { ...data, is_decimal: Number(data.is_decimal) } })}
      onDelete={(id) => remove.mutateAsync(id)}
    />
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
      setMessage('Saved.');
      setTimeout(() => setMessage(''), 2000);
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
    <div className="card p-4">
      <div className="mb-3 font-semibold text-ink">Category → Brand Mapping</div>
      <p className="mb-3 text-xs text-ink-muted">
        Restrict which brands are valid under a category. A category with no brands checked has no restriction (any brand allowed).
      </p>
      <select value={categoryId} onChange={(e) => pickCategory(e.target.value)} className="input mb-3 w-64">
        <option value="">Select category</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      {categoryId && (
        <>
          <div className="mb-3 flex flex-wrap gap-3">
            {brands.map((b) => (
              <label key={b.id} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={selected.includes(b.id)} onChange={() => toggle(b.id)} />
                {b.name}
              </label>
            ))}
            {brands.length === 0 && <span className="text-sm text-ink-muted">No brands yet — add some in the Brands tab.</span>}
          </div>
          <Button size="sm" onClick={() => saveMutation.mutate()}>Save Mapping</Button>
          {message && <span className="ml-3 text-sm text-success">{message}</span>}
        </>
      )}
    </div>
  );
}

export function Catalog() {
  const canManage = usePermission('catalog.manage_items');

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink">Catalog</h1>
      <Tabs
        tabs={[
          { key: 'items', label: 'Items', content: <ItemsPanel canManage={canManage} /> },
          { key: 'categories', label: 'Categories', content: <CategoriesPanel canManage={canManage} /> },
          { key: 'brands', label: 'Brands', content: <BrandsPanel canManage={canManage} /> },
          { key: 'category-brand', label: 'Category ↔ Brand', content: <CategoryBrandMappingPanel /> },
          { key: 'product-lines', label: 'Product Lines', content: <ProductLinesPanel canManage={canManage} /> },
          { key: 'units-tax', label: 'Units & Tax', content: (
            <div className="flex flex-col gap-4">
              <StockUnitsPanel canManage={canManage} />
              <TaxCodesPanel canManage={canManage} />
            </div>
          ) },
        ]}
      />
    </div>
  );
}
