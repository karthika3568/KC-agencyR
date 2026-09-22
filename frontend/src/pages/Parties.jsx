import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { routesApi, citiesApi, customersApi, suppliersApi } from '../api/parties';
import { routeSuppliersApi } from '../api/purchasing';
import { EntityTable } from '../components/EntityTable';
import { Tabs } from '../components/Tabs';
import { Button } from '../components/Button.jsx';
import { usePermission } from '../hooks/usePermission';

function useEntity(key, api) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: [key], queryFn: api.list });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [key] });
  const create = useMutation({ mutationFn: api.create, onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, data }) => api.update(id, data), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: api.remove, onSuccess: invalidate });
  return { rows: query.data || [], create, update, remove };
}

function RoutesPanel({ canManage }) {
  const { rows, create, remove } = useEntity('routes', routesApi);
  return (
    <div className="flex flex-col gap-4">
      <EntityTable
        title="Routes"
        canManage={canManage}
        fields={[{ name: 'name', label: 'Route name', required: true }]}
        columns={[{ key: 'name', label: 'Name' }]}
        rows={rows}
        onCreate={(data) => create.mutateAsync(data)}
        onDelete={(id) => remove.mutateAsync(id)}
      />
      <RouteSupplierMappingPanel canManage={canManage} />
    </div>
  );
}

function CitiesPanel({ canManage }) {
  const { rows, create, remove } = useEntity('cities', citiesApi);
  const routesQuery = useQuery({ queryKey: ['routes'], queryFn: routesApi.list });
  const routes = routesQuery.data || [];
  const routeName = (id) => routes.find((r) => r.id === id)?.name || '—';

  return (
    <EntityTable
      title="Cities"
      canManage={canManage}
      fields={[
        { name: 'name', label: 'City name', required: true },
        {
          name: 'route_id',
          label: 'Route',
          type: 'select',
          required: true,
          options: routes.map((r) => ({ value: r.id, label: r.name })),
        },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'route_id', label: 'Route', render: (r) => routeName(r.route_id) },
      ]}
      rows={rows}
      onCreate={(data) => create.mutateAsync({ ...data, route_id: Number(data.route_id) })}
      onDelete={(id) => remove.mutateAsync(id)}
    />
  );
}

function CustomersPanel({ canManage }) {
  const { rows, create, remove } = useEntity('customers', customersApi);
  const routesQuery = useQuery({ queryKey: ['routes'], queryFn: routesApi.list });
  const citiesQuery = useQuery({ queryKey: ['cities'], queryFn: citiesApi.list });
  const routes = routesQuery.data || [];
  const cities = citiesQuery.data || [];

  return (
    <EntityTable
      title="Customers"
      canManage={canManage}
      fields={[
        { name: 'ledger_name', label: 'Ledger name', required: true },
        { name: 'phone', label: 'Phone' },
        {
          name: 'route_id',
          label: 'Route',
          type: 'select',
          options: routes.map((r) => ({ value: r.id, label: r.name })),
        },
        {
          name: 'city_id',
          label: 'City',
          type: 'select',
          options: cities.map((c) => ({ value: c.id, label: c.name })),
        },
        { name: 'credit_limit', label: 'Credit limit', type: 'number', default: '0' },
        {
          name: 'is_local_customer',
          label: 'Local customer?',
          type: 'select',
          default: '1',
          options: [
            { value: '1', label: 'Local' },
            { value: '0', label: 'Outstation' },
          ],
        },
      ]}
      columns={[
        { key: 'ledger_name', label: 'Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'credit_limit', label: 'Credit limit' },
        { key: 'is_local_customer', label: 'Type', render: (r) => (r.is_local_customer ? 'Local' : 'Outstation') },
        { key: 'status', label: 'Status' },
      ]}
      rows={rows}
      onCreate={(data) =>
        create.mutateAsync({
          ...data,
          route_id: data.route_id ? Number(data.route_id) : null,
          city_id: data.city_id ? Number(data.city_id) : null,
          credit_limit: Number(data.credit_limit || 0),
          is_local_customer: Number(data.is_local_customer ?? 1),
        })
      }
      onDelete={(id) => remove.mutateAsync(id)}
    />
  );
}

function SuppliersPanel({ canManage }) {
  const { rows, create, update, remove } = useEntity('suppliers', suppliersApi);
  const balancesQuery = useQuery({ queryKey: ['suppliers', 'balances'], queryFn: suppliersApi.balances });
  const balanceById = new Map((balancesQuery.data || []).map((b) => [b.id, b]));

  return (
    <EntityTable
      title="Suppliers"
      canManage={canManage}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'phone', label: 'Phone' },
        { name: 'gstin', label: 'GSTIN' },
        { name: 'opening_balance', label: 'Opening balance', type: 'number', default: '0' },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'gstin', label: 'GSTIN' },
        { key: 'opening_balance', label: 'Opening Balance', render: (r) => `Rs. ${Number(r.opening_balance).toFixed(2)}` },
        {
          key: 'total_purchases',
          label: 'Payable (Purchases)',
          render: (r) => `Rs. ${Number(balanceById.get(r.id)?.total_purchases ?? 0).toFixed(2)}`,
        },
        {
          key: 'total_paid',
          label: 'Paid',
          render: (r) => `Rs. ${Number(balanceById.get(r.id)?.total_paid ?? 0).toFixed(2)}`,
        },
        {
          key: 'current_outstanding',
          label: 'Current Outstanding',
          render: (r) => {
            const val = Number(balanceById.get(r.id)?.current_outstanding ?? 0);
            return <span className={val > 0.009 ? 'font-semibold text-danger' : 'font-semibold text-success'}>Rs. {val.toFixed(2)}</span>;
          },
        },
        { key: 'status', label: 'Status' },
      ]}
      rows={rows}
      onCreate={(data) => create.mutateAsync({ ...data, opening_balance: Number(data.opening_balance || 0) })}
      onUpdate={(id, data) => update.mutateAsync({ id, data: { ...data, opening_balance: Number(data.opening_balance || 0) } })}
      onDelete={(id) => remove.mutateAsync(id)}
    />
  );
}

function RouteSupplierMappingPanel({ canManage }) {
  const [routeId, setRouteId] = useState('');
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState('');
  const routesQuery = useQuery({ queryKey: ['routes'], queryFn: routesApi.list });
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: suppliersApi.list });

  const saveMutation = useMutation({
    mutationFn: () => routeSuppliersApi.set(routeId, selected),
    onSuccess: () => {
      setMessage('Saved.');
      setTimeout(() => setMessage(''), 2000);
    },
  });

  const routes = routesQuery.data || [];
  const suppliers = suppliersQuery.data || [];

  const pickRoute = async (id) => {
    setRouteId(id);
    if (id) {
      const data = await routeSuppliersApi.get(id);
      setSelected(data.supplier_ids || []);
    } else {
      setSelected([]);
    }
  };

  const toggle = (supplierId) => {
    setSelected((prev) => (prev.includes(supplierId) ? prev.filter((s) => s !== supplierId) : [...prev, supplierId]));
  };

  return (
    <div className="card p-4">
      <div className="mb-3 font-semibold text-ink">Route → Supplier Mapping</div>
      <p className="mb-3 text-xs text-ink-muted">
        Restrict which suppliers can be picked for a Purchase Request raised on this route. A route with none checked shows every supplier (no restriction).
      </p>
      <select value={routeId} onChange={(e) => pickRoute(e.target.value)} className="input mb-3 w-64" disabled={!canManage}>
        <option value="">Select route</option>
        {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>

      {routeId && (
        <>
          <div className="mb-3 flex flex-wrap gap-3">
            {suppliers.map((s) => (
              <label key={s.id} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} disabled={!canManage} />
                {s.name}
              </label>
            ))}
            {suppliers.length === 0 && <span className="text-sm text-ink-muted">No suppliers yet — add some in the Suppliers tab.</span>}
          </div>
          {canManage && <Button size="sm" onClick={() => saveMutation.mutate()}>Save Mapping</Button>}
          {message && <span className="ml-2 text-sm text-success">{message}</span>}
        </>
      )}
    </div>
  );
}

export function Parties() {
  const canManageCustomers = usePermission('parties.manage_customers');
  const canManageSuppliers = usePermission('parties.manage_suppliers');

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink">Parties</h1>
      <Tabs
        tabs={[
          { key: 'customers', label: 'Customers', content: <CustomersPanel canManage={canManageCustomers} /> },
          { key: 'suppliers', label: 'Suppliers', content: <SuppliersPanel canManage={canManageSuppliers} /> },
          { key: 'routes', label: 'Routes', content: <RoutesPanel canManage={canManageCustomers} /> },
          { key: 'cities', label: 'Cities', content: <CitiesPanel canManage={canManageCustomers} /> },
        ]}
      />
    </div>
  );
}
