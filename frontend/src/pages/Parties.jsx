import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { routesApi, citiesApi, customersApi, suppliersApi } from '../api/parties';
import { EntityTable } from '../components/EntityTable';
import { Tabs } from '../components/Tabs';
import { usePermission } from '../hooks/usePermission';

function useEntity(key, api) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: [key], queryFn: api.list });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [key] });
  const create = useMutation({ mutationFn: api.create, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: api.remove, onSuccess: invalidate });
  return { rows: query.data || [], create, remove };
}

function RoutesPanel({ canManage }) {
  const { rows, create, remove } = useEntity('routes', routesApi);
  return (
    <EntityTable
      title="Routes"
      canManage={canManage}
      fields={[{ name: 'name', label: 'Route name', required: true }]}
      columns={[{ key: 'name', label: 'Name' }]}
      rows={rows}
      onCreate={(data) => create.mutateAsync(data)}
      onDelete={(id) => remove.mutateAsync(id)}
    />
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
  const { rows, create, remove } = useEntity('suppliers', suppliersApi);
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
        { key: 'opening_balance', label: 'Opening balance' },
        { key: 'status', label: 'Status' },
      ]}
      rows={rows}
      onCreate={(data) => create.mutateAsync({ ...data, opening_balance: Number(data.opening_balance || 0) })}
      onDelete={(id) => remove.mutateAsync(id)}
    />
  );
}

export function Parties() {
  const canManageCustomers = usePermission('parties.manage_customers');
  const canManageSuppliers = usePermission('parties.manage_suppliers');

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-800">Parties</h1>
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
