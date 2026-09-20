import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collectionsApi } from '../api/postsale';
import { usePermission } from '../hooks/usePermission';

function CollectModal({ customer, onClose }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const unpaidQuery = useQuery({
    queryKey: ['unpaid-invoices', customer.customer_id],
    queryFn: () => collectionsApi.unpaidInvoices(customer.customer_id),
  });
  const createMutation = useMutation({
    mutationFn: collectionsApi.create,
    onSuccess: (data) => {
      setSuccess(data);
      queryClient.invalidateQueries({ queryKey: ['collections-pending'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['unpaid-invoices', customer.customer_id] });
    },
  });

  const unpaid = unpaidQuery.data || [];
  let remaining = Number(amount || 0);
  const preview = unpaid.map((inv) => {
    const due = Number(inv.balance_due);
    const applied = Math.max(0, Math.min(remaining, due));
    remaining -= applied;
    return { ...inv, applied, remAfter: due - applied };
  });

  const submit = async () => {
    setError('');
    try {
      await createMutation.mutateAsync({ customer_id: customer.customer_id, amount: Number(amount), payment_method: paymentMethod });
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save');
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30">
      <div className="w-[480px] rounded-lg bg-white p-5 shadow-lg">
        <div className="mb-1 text-lg font-semibold text-gray-800">Collect from {customer.ledger_name}</div>
        <div className="mb-3 text-xs text-gray-500">
          Route: {customer.route_id || '-'} · Credit limit: Rs. {customer.credit_limit} · Outstanding: Rs. {customer.total_due}
        </div>

        <div className="mb-3 flex gap-2">
          <input type="number" step="any" placeholder="Amount collected" value={amount} onChange={(e) => setAmount(e.target.value)} className="input flex-1" />
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input w-32">
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="mb-3 max-h-56 overflow-auto rounded border border-gray-100">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-3 py-1.5">Invoice</th><th className="px-3 py-1.5">Pending</th><th className="px-3 py-1.5">This Pay</th><th className="px-3 py-1.5">Rem</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-3 py-1.5">{inv.invoice_no}</td>
                  <td className="px-3 py-1.5">{inv.balance_due}</td>
                  <td className="px-3 py-1.5 font-medium text-blue-700">{inv.applied.toFixed(2)}</td>
                  <td className="px-3 py-1.5">{inv.remAfter.toFixed(2)}</td>
                </tr>
              ))}
              {unpaid.length === 0 && <tr><td colSpan={4} className="px-3 py-3 text-center text-gray-400">No unpaid invoices.</td></tr>}
            </tbody>
          </table>
        </div>

        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        {success && <p className="mb-2 text-sm text-green-700">Collected Rs. {success.allocated_total} across {Object.keys(success.allocations).length} invoice(s).</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700">Close</button>
          <button onClick={submit} disabled={!amount} className="rounded bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40">
            Save Collection
          </button>
        </div>
      </div>
    </div>
  );
}

export function Collections() {
  const canCollect = usePermission('collections.field_collection_entry');
  const canViewAll = usePermission('credit.view_shopwide_outstanding');
  const [selected, setSelected] = useState(null);

  const pendingQuery = useQuery({ queryKey: ['collections-pending'], queryFn: () => collectionsApi.pending(), enabled: canViewAll });
  const historyQuery = useQuery({ queryKey: ['collections'], queryFn: collectionsApi.list });

  const pending = pendingQuery.data || [];
  const history = historyQuery.data || [];
  const routeTotal = pending.reduce((sum, c) => sum + Number(c.total_due), 0);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-800">Customer Collections</h1>

      {canViewAll && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="font-semibold text-gray-800">Route Pending Credit Balances</span>
            <span className="text-sm font-medium text-gray-600">Total pending: Rs. {routeTotal.toFixed(2)}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-4 py-2">Customer</th><th className="px-4 py-2">Phone</th><th className="px-4 py-2">Unpaid Bills</th><th className="px-4 py-2">Total Due</th><th></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((c) => (
                <tr key={c.customer_id} className="border-b border-gray-50">
                  <td className="px-4 py-2">{c.ledger_name}</td>
                  <td className="px-4 py-2">{c.phone || '-'}</td>
                  <td className="px-4 py-2">{c.unpaid_invoice_count}</td>
                  <td className="px-4 py-2 font-medium text-red-600">{c.total_due}</td>
                  <td className="px-4 py-2 text-right">
                    {canCollect && (
                      <button onClick={() => setSelected(c)} className="text-xs font-medium text-blue-600 hover:underline">Collect</button>
                    )}
                  </td>
                </tr>
              ))}
              {pending.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No customers with an outstanding balance.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3 font-semibold text-gray-800">Past Collection Receipts</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
              <th className="px-4 py-2">Receipt #</th><th className="px-4 py-2">Customer</th><th className="px-4 py-2">Amount</th><th className="px-4 py-2">Mode</th><th className="px-4 py-2">Collected By</th><th className="px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {history.map((c) => (
              <tr key={c.id} className="border-b border-gray-50">
                <td className="px-4 py-2">{c.receipt_no}</td>
                <td className="px-4 py-2">{c.customer_name}</td>
                <td className="px-4 py-2">{c.amount}</td>
                <td className="px-4 py-2 capitalize">{c.payment_method}</td>
                <td className="px-4 py-2 text-gray-500">{c.collected_by_name}</td>
                <td className="px-4 py-2 text-gray-500">{c.collected_at}</td>
              </tr>
            ))}
            {history.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No collections yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && <CollectModal customer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
