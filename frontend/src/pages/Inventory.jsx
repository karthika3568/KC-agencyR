import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { itemsApi } from '../api/catalog';
import { usersApi } from '../api/users';
import { stockAdjustmentsApi, stockHubApi, vanStockApi } from '../api/purchasing';
import { Tabs } from '../components/Tabs';
import { usePermission } from '../hooks/usePermission';

function StockHubPanel() {
  const [ownerType, setOwnerType] = useState('');
  const stockQuery = useQuery({ queryKey: ['stock-hub', ownerType], queryFn: () => stockHubApi.list(ownerType ? { owner_type: ownerType } : {}) });
  const lowStockQuery = useQuery({ queryKey: ['stock-hub-low'], queryFn: stockHubApi.lowStock });

  const rows = stockQuery.data || [];
  const low = lowStockQuery.data || [];

  return (
    <div className="flex flex-col gap-4">
      {low.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning-bg p-3 text-sm text-warning">
          <strong>{low.length} item(s) at or below their minimum stock threshold:</strong>{' '}
          {low.map((i) => i.item_name).join(', ')}
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between border-b border-border-soft px-4 py-3">
          <span className="font-semibold text-ink">Stock Hub</span>
          <select value={ownerType} onChange={(e) => setOwnerType(e.target.value)} className="input w-40">
            <option value="">All owners</option>
            <option value="branch">Branch floor</option>
            <option value="employee">Salesman (van)</option>
          </select>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft text-left text-xs uppercase text-ink-muted">
              <th className="px-4 py-2">Item</th><th className="px-4 py-2">Owner Type</th><th className="px-4 py-2">Owner</th><th className="px-4 py-2">Qty</th><th className="px-4 py-2">Unit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border-soft">
                <td className="px-4 py-2">{r.item_name} <span className="text-ink-muted">({r.item_code})</span></td>
                <td className="px-4 py-2 capitalize">{r.owner_type}</td>
                <td className="px-4 py-2">{r.owner_name}</td>
                <td className={`px-4 py-2 font-medium ${Number(r.quantity_on_hand) < 0 ? 'text-red-600' : 'text-ink'}`}>{r.quantity_on_hand}</td>
                <td className="px-4 py-2 text-ink-muted">{r.unit_code}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-muted">No stock movements yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StockAdjustmentPanel({ canManage }) {
  const queryClient = useQueryClient();
  const [itemId, setItemId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('deduction');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('damage');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list('') });
  const adjustmentsQuery = useQuery({ queryKey: ['stock-adjustments'], queryFn: stockAdjustmentsApi.list });
  const createMutation = useMutation({
    mutationFn: stockAdjustmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['stock-hub'] });
      setItemId(''); setQty(''); setRemarks('');
    },
  });

  const submit = async () => {
    setError('');
    try {
      await createMutation.mutateAsync({ item_id: Number(itemId), adjustment_type: adjustmentType, qty: Number(qty), reason, remarks: remarks || null });
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save');
    }
  };

  const items = itemsQuery.data || [];
  const adjustments = adjustmentsQuery.data || [];

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="card p-4">
          <div className="mb-2 font-semibold text-ink">Stock Adjustment</div>
          <div className="flex flex-wrap gap-2">
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="input w-56">
              <option value="">Select item</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.item_name}</option>)}
            </select>
            <select value={adjustmentType} onChange={(e) => setAdjustmentType(e.target.value)} className="input w-32">
              <option value="addition">Addition</option>
              <option value="deduction">Deduction</option>
            </select>
            <input type="number" step="any" placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)} className="input w-24" />
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="input w-40">
              <option value="damage">Damage</option>
              <option value="spoilage">Spoilage</option>
              <option value="count_correction">Count correction</option>
              <option value="other">Other</option>
            </select>
            <input placeholder="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="input w-48" />
          </div>
          <button onClick={submit} disabled={!itemId || !qty} className="mt-3 rounded bg-success px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40">
            Save Adjustment
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      <div className="card">
        <div className="border-b border-border-soft px-4 py-3 font-semibold text-ink">Adjustment History</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft text-left text-xs uppercase text-ink-muted">
              <th className="px-4 py-2">Item</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Qty</th><th className="px-4 py-2">Reason</th><th className="px-4 py-2">By</th><th className="px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.map((a) => (
              <tr key={a.id} className="border-b border-border-soft">
                <td className="px-4 py-2">{a.item_name}</td>
                <td className="px-4 py-2 capitalize">{a.adjustment_type}</td>
                <td className="px-4 py-2">{a.qty}</td>
                <td className="px-4 py-2 capitalize">{a.reason.replace('_', ' ')}</td>
                <td className="px-4 py-2 text-ink-muted">{a.created_by_name}</td>
                <td className="px-4 py-2 text-ink-muted">{a.created_at}</td>
              </tr>
            ))}
            {adjustments.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-muted">No adjustments yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VanStockPanel({ canManage }) {
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = useState('');
  const [mode, setMode] = useState('issue');
  const [lines, setLines] = useState([{ item_id: '', qty: 1 }]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: usersApi.list });
  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list('') });
  const pendingQuery = useQuery({
    queryKey: ['van-pending', employeeId],
    queryFn: () => vanStockApi.pending(employeeId),
    enabled: !!employeeId,
  });

  const mutation = useMutation({
    mutationFn: (payload) => (mode === 'issue' ? vanStockApi.issue(payload) : vanStockApi.returnStock(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['van-pending', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['stock-hub'] });
      setLines([{ item_id: '', qty: 1 }]);
      setMessage(mode === 'issue' ? 'Stock issued.' : 'Return recorded.');
      setTimeout(() => setMessage(''), 3000);
    },
  });

  const updateLine = (idx, patch) => setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, { item_id: '', qty: 1 }]);
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    setError('');
    try {
      await mutation.mutateAsync({
        employee_id: Number(employeeId),
        items: lines.filter((l) => l.item_id).map((l) => ({ item_id: Number(l.item_id), qty: Number(l.qty) })),
      });
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save');
    }
  };

  const users = usersQuery.data || [];
  const items = itemsQuery.data || [];
  const pending = pendingQuery.data || [];

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="card p-4">
          <div className="mb-2 flex gap-2">
            <button onClick={() => setMode('issue')} className={`rounded px-3 py-1 text-sm font-medium ${mode === 'issue' ? 'bg-success text-white' : 'bg-gray-100 text-ink'}`}>
              Issue Stock
            </button>
            <button onClick={() => setMode('return')} className={`rounded px-3 py-1 text-sm font-medium ${mode === 'return' ? 'bg-success text-white' : 'bg-gray-100 text-ink'}`}>
              Day-end Return
            </button>
          </div>

          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="input mb-3 w-56">
            <option value="">Select salesman</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role_name})</option>)}
          </select>

          {employeeId && (
            <div className="mb-3 text-xs text-ink-muted">
              Currently with this salesman: {pending.length === 0 ? 'nothing' : pending.map((p) => `Item #${p.item_id}: ${p.quantity_on_hand}`).join(', ')}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select value={line.item_id} onChange={(e) => updateLine(idx, { item_id: e.target.value })} className="input w-56">
                  <option value="">Select item</option>
                  {items.map((i) => <option key={i.id} value={i.id}>{i.item_name}</option>)}
                </select>
                <input type="number" step="any" value={line.qty} onChange={(e) => updateLine(idx, { qty: e.target.value })} className="input w-24" />
                <button onClick={() => removeLine(idx)} className="text-xs text-red-600">&times;</button>
              </div>
            ))}
            <button onClick={addLine} className="self-start text-xs font-medium text-gold hover:underline">+ Add line</button>
          </div>

          <button onClick={submit} disabled={!employeeId} className="mt-3 rounded bg-success px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40">
            {mode === 'issue' ? 'Issue Stock' : 'Save Return'}
          </button>
          {message && <p className="mt-2 text-sm text-success">{message}</p>}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

export function Inventory() {
  const canView = usePermission('inventory.view_stock');
  const canAdjust = usePermission('inventory.stock_adjustment');
  const canIssue = usePermission('inventory.issue_van_stock');

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-ink">Inventory</h1>
      <Tabs
        tabs={[
          { key: 'hub', label: 'Stock Hub', content: canView ? <StockHubPanel /> : <p className="text-ink-muted">No access.</p> },
          { key: 'adjust', label: 'Stock Adjustment', content: <StockAdjustmentPanel canManage={canAdjust} /> },
          { key: 'van', label: 'Van / Salesman Stock', content: <VanStockPanel canManage={canIssue} /> },
        ]}
      />
    </div>
  );
}
