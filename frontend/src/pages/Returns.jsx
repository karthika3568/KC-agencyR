import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { itemsApi } from '../api/catalog';
import { customersApi, suppliersApi } from '../api/parties';
import { invoicesApi } from '../api/invoices';
import { salesReturnsApi, purchaseReturnsApi } from '../api/postsale';
import { Tabs } from '../components/Tabs';
import { usePermission } from '../hooks/usePermission';

function ReturnLineEditor({ lines, setLines, items }) {
  const addLine = () => setLines((prev) => [...prev, { item_id: '', qty: 1, rate: 0 }]);
  const updateLine = (idx, patch) => setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="flex flex-col gap-2">
      {lines.map((line, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <select value={line.item_id} onChange={(e) => updateLine(idx, { item_id: e.target.value })} className="input w-56">
            <option value="">Select item</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.item_name}</option>)}
          </select>
          <input type="number" step="any" placeholder="Qty" value={line.qty} onChange={(e) => updateLine(idx, { qty: e.target.value })} className="input w-20" />
          <input type="number" step="any" placeholder="Rate" value={line.rate} onChange={(e) => updateLine(idx, { rate: e.target.value })} className="input w-24" />
          <button onClick={() => removeLine(idx)} className="text-xs text-red-600">&times;</button>
        </div>
      ))}
      <button onClick={addLine} className="self-start text-xs font-medium text-blue-600 hover:underline">+ Add line</button>
    </div>
  );
}

function SalesReturnsPanel({ canCreate, canApprove }) {
  const queryClient = useQueryClient();
  const [invoiceId, setInvoiceId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [refundAction, setRefundAction] = useState('credit_note');
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState([{ item_id: '', qty: 1, rate: 0 }]);
  const [error, setError] = useState('');

  const returnsQuery = useQuery({ queryKey: ['sales-returns'], queryFn: salesReturnsApi.list });
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: customersApi.list });
  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list('') });

  const createMutation = useMutation({
    mutationFn: salesReturnsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-returns'] });
      setInvoiceId(''); setCustomerId(''); setReason('');
      setLines([{ item_id: '', qty: 1, rate: 0 }]);
    },
  });
  const approveMutation = useMutation({ mutationFn: salesReturnsApi.approve, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales-returns'] }) });
  const rejectMutation = useMutation({ mutationFn: salesReturnsApi.reject, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales-returns'] }) });

  const submit = async () => {
    setError('');
    try {
      await createMutation.mutateAsync({
        invoice_id: invoiceId ? Number(invoiceId) : null,
        customer_id: customerId ? Number(customerId) : null,
        refund_action: refundAction,
        reason: reason || null,
        items: lines.filter((l) => l.item_id).map((l) => ({ item_id: Number(l.item_id), qty: Number(l.qty), rate: Number(l.rate) })),
      });
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save');
    }
  };

  const returns = returnsQuery.data || [];
  const customers = customersQuery.data || [];
  const items = itemsQuery.data || [];

  return (
    <div className="flex flex-col gap-4">
      {canCreate && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-2 font-semibold text-gray-800">New Sales Return</div>
          <p className="mb-2 text-xs text-gray-500">
            Leave Invoice # blank for an untraceable return (no original bill) — it will require admin approval before stock/credit are updated.
          </p>
          <div className="mb-2 flex flex-wrap gap-2">
            <input placeholder="Invoice ID (optional)" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} className="input w-40" />
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input w-56">
              <option value="">Walk-in / unknown customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.ledger_name}</option>)}
            </select>
            <select value={refundAction} onChange={(e) => setRefundAction(e.target.value)} className="input w-40">
              <option value="credit_note">Credit Note</option>
              <option value="cash_refund">Cash Refund</option>
            </select>
            <input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} className="input w-48" />
          </div>
          <ReturnLineEditor lines={lines} setLines={setLines} items={items} />
          <button onClick={submit} className="mt-3 rounded bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white">
            Save Return
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3 font-semibold text-gray-800">Sales Returns</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
              <th className="px-4 py-2">Return #</th><th className="px-4 py-2">Invoice</th><th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Refund</th><th className="px-4 py-2">Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {returns.map((r) => (
              <tr key={r.id} className="border-b border-gray-50">
                <td className="px-4 py-2">{r.return_no}</td>
                <td className="px-4 py-2">{r.invoice_no || <span className="text-amber-600">untraceable</span>}</td>
                <td className="px-4 py-2">{r.customer_name || '-'}</td>
                <td className="px-4 py-2 capitalize">{r.refund_action.replace('_', ' ')}</td>
                <td className="px-4 py-2 capitalize">{r.status.replace('_', ' ')}</td>
                <td className="px-4 py-2 text-right">
                  {r.status === 'pending_approval' && canApprove && (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => approveMutation.mutate(r.id)} className="text-xs font-medium text-green-600 hover:underline">Approve</button>
                      <button onClick={() => rejectMutation.mutate(r.id)} className="text-xs font-medium text-red-600 hover:underline">Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {returns.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No sales returns yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PurchaseReturnsPanel({ canManage }) {
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState('');
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState([{ item_id: '', qty: 1, rate: 0 }]);
  const [error, setError] = useState('');

  const returnsQuery = useQuery({ queryKey: ['purchase-returns'], queryFn: purchaseReturnsApi.list });
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: suppliersApi.list });
  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list('') });

  const createMutation = useMutation({
    mutationFn: purchaseReturnsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-returns'] });
      setSupplierId(''); setReason('');
      setLines([{ item_id: '', qty: 1, rate: 0 }]);
    },
  });

  const submit = async () => {
    setError('');
    try {
      await createMutation.mutateAsync({
        supplier_id: Number(supplierId),
        reason: reason || null,
        items: lines.filter((l) => l.item_id).map((l) => ({ item_id: Number(l.item_id), qty: Number(l.qty), rate: Number(l.rate) })),
      });
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save');
    }
  };

  const returns = returnsQuery.data || [];
  const suppliers = suppliersQuery.data || [];
  const items = itemsQuery.data || [];

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-2 font-semibold text-gray-800">New Purchase Return</div>
          <div className="mb-2 flex flex-wrap gap-2">
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="input w-56">
              <option value="">Select supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} className="input w-48" />
          </div>
          <ReturnLineEditor lines={lines} setLines={setLines} items={items} />
          <button onClick={submit} disabled={!supplierId} className="mt-3 rounded bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40">
            Save Return
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3 font-semibold text-gray-800">Purchase Returns</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
              <th className="px-4 py-2">Return #</th><th className="px-4 py-2">GRN</th><th className="px-4 py-2">Supplier</th><th className="px-4 py-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((r) => (
              <tr key={r.id} className="border-b border-gray-50">
                <td className="px-4 py-2">{r.return_no}</td>
                <td className="px-4 py-2">{r.grn_no || '-'}</td>
                <td className="px-4 py-2">{r.supplier_name}</td>
                <td className="px-4 py-2 text-gray-500">{r.reason || '-'}</td>
              </tr>
            ))}
            {returns.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No purchase returns yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Returns() {
  const canSalesReturn = usePermission('returns.sales_return');
  const canApprove = usePermission('returns.approve_untraceable_return');
  const canPurchaseReturn = usePermission('returns.purchase_return');

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-800">Returns</h1>
      <Tabs
        tabs={[
          { key: 'sales', label: 'Sales Returns', content: <SalesReturnsPanel canCreate={canSalesReturn} canApprove={canApprove} /> },
          { key: 'purchase', label: 'Purchase Returns', content: <PurchaseReturnsPanel canManage={canPurchaseReturn} /> },
        ]}
      />
    </div>
  );
}
