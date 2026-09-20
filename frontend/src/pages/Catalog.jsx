import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { categoriesApi, brandsApi, productLinesApi, taxCodesApi, stockUnitsApi } from '../api/catalog';
import { EntityTable } from '../components/EntityTable';
import { Tabs } from '../components/Tabs';
import { usePermission } from '../hooks/usePermission';
import { ItemsPanel } from './ItemsPanel.jsx';

function useEntity(key, api) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: [key], queryFn: api.list });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [key] });
  const create = useMutation({ mutationFn: api.create, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: api.remove, onSuccess: invalidate });

  return { rows: query.data || [], isLoading: query.isLoading, create, remove };
}

function CategoriesPanel({ canManage }) {
  const { rows, create, remove } = useEntity('categories', categoriesApi);
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
      onDelete={(id) => remove.mutateAsync(id)}
    />
  );
}

function BrandsPanel({ canManage }) {
  const { rows, create, remove } = useEntity('brands', brandsApi);
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
      onDelete={(id) => remove.mutateAsync(id)}
    />
  );
}

function ProductLinesPanel({ canManage }) {
  const { rows, create, remove } = useEntity('product-lines', productLinesApi);
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
      onDelete={(id) => remove.mutateAsync(id)}
    />
  );
}

function TaxCodesPanel({ canManage }) {
  const { rows, create, remove } = useEntity('tax-codes', taxCodesApi);
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
      onDelete={(id) => remove.mutateAsync(id)}
    />
  );
}

function StockUnitsPanel({ canManage }) {
  const { rows, create, remove } = useEntity('stock-units', stockUnitsApi);
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
      onDelete={(id) => remove.mutateAsync(id)}
    />
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
