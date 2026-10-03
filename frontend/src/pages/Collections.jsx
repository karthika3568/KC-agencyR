import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, Square } from 'lucide-react';
import { collectionsApi } from '../api/postsale';
import { usePermission } from '../hooks/usePermission';
import { Button } from '../components/Button.jsx';

function CollectModal({ customer, onClose }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState('fifo'); // 'fifo' | 'manual'
  const [amount, setAmount] = useState('');
  const [checkedIds, setCheckedIds] = useState([]);
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

  // FIFO preview (mirrors the backend's own default allocation).
  let remaining = Number(amount || 0);
  const fifoPreview = unpaid.map((inv) => {
    const due = Number(inv.balance_due);
    const applied = Math.max(0, Math.min(remaining, due));
    remaining -= applied;
    return { ...inv, applied, remAfter: due - applied };
  });

  const toggleChecked = (id) => setCheckedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const checkedTotal = unpaid.filter((inv) => checkedIds.includes(inv.id)).reduce((sum, inv) => sum + Number(inv.balance_due), 0);

  const submit = async () => {
    setError('');
    try {
      if (mode === 'manual') {
        const allocations = unpaid
          .filter((inv) => checkedIds.includes(inv.id))
          .map((inv) => ({ invoice_id: inv.id, allocated_amount: Number(inv.balance_due) }));
        await createMutation.mutateAsync({
          customer_id: customer.customer_id,
          amount: checkedTotal,
          payment_method: paymentMethod,
          allocations,
        });
      } else {
        await createMutation.mutateAsync({ customer_id: customer.customer_id, amount: Number(amount), payment_method: paymentMethod });
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save');
    }
  };

  const canSubmit = mode === 'manual' ? checkedIds.length > 0 : !!amount;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30">
      <div className="w-[520px] card p-5">
        <div className="mb-1 text-lg font-semibold text-ink">Collect from {customer.ledger_name}</div>
        <div className="mb-3 text-xs text-ink-muted">
          Route: {customer.route_id || '-'} · Credit limit: Rs. {customer.credit_limit} · Outstanding: Rs. {customer.total_due}
        </div>

        <div className="mb-3 flex gap-1 rounded-lg border border-border-soft bg-page p-1 text-sm">
          <button onClick={() => setMode('fifo')} className={`flex-1 rounded px-3 py-1.5 font-medium ${mode === 'fifo' ? 'bg-white shadow-sm text-ink' : 'text-ink-muted'}`}>
            Auto (Oldest Bill First)
          </button>
          <button onClick={() => setMode('manual')} className={`flex-1 rounded px-3 py-1.5 font-medium ${mode === 'manual' ? 'bg-white shadow-sm text-ink' : 'text-ink-muted'}`}>
            Select Invoices
          </button>
        </div>

        {mode === 'fifo' ? (
          <>
            <div className="mb-3 flex gap-2">
              <input type="number" step="any" placeholder="Amount collected" value={amount} onChange={(e) => setAmount(e.target.value)} className="input flex-1" />
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input w-32">
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="mb-3 max-h-56 overflow-auto rounded border border-border-soft">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-page text-left text-ink-muted">
                    <th className="px-3 py-1.5">Invoice</th><th className="px-3 py-1.5">Pending</th><th className="px-3 py-1.5">This Pay</th><th className="px-3 py-1.5">Rem</th>
                  </tr>
                </thead>
                <tbody>
                  {fifoPreview.map((inv) => (
                    <tr key={inv.id}>
                      <td className="px-3 py-1.5">{inv.invoice_no}</td>
                      <td className="px-3 py-1.5">{inv.balance_due}</td>
                      <td className="px-3 py-1.5 font-medium text-gold">{inv.applied.toFixed(2)}</td>
                      <td className="px-3 py-1.5">{inv.remAfter.toFixed(2)}</td>
                    </tr>
                  ))}
                  {unpaid.length === 0 && <tr><td colSpan={4} className="px-3 py-3 text-center text-ink-muted">No unpaid invoices.</td></tr>}
                </tbody>
              </table>
            </div>
            {remaining > 0 && Number(amount) > 0 && (
              <div className="mb-3 rounded bg-indigo-50 border border-indigo-200 p-2 text-xs text-indigo-700 font-medium">
                Note: Rs. {remaining.toFixed(2)} extra amount will be credited to customer's advance balance and recorded in revenue/collections.
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-3 max-h-56 overflow-auto rounded border border-border-soft">
              {unpaid.map((inv) => (
                <label key={inv.id} className="flex cursor-pointer items-center justify-between border-b border-border-soft px-3 py-2 text-sm last:border-0 hover:bg-page">
                  <span className="flex items-center gap-2">
                    <input type="checkbox" checked={checkedIds.includes(inv.id)} onChange={() => toggleChecked(inv.id)} className="hidden" />
                    {checkedIds.includes(inv.id) ? <CheckSquare size={16} className="text-gold" /> : <Square size={16} className="text-ink-muted" />}
                    {inv.invoice_no}
                  </span>
                  <span className="font-medium text-ink">Rs. {inv.balance_due}</span>
                </label>
              ))}
              {unpaid.length === 0 && <div className="px-3 py-3 text-center text-sm text-ink-muted">No unpaid invoices.</div>}
            </div>
            <div className="mb-3 flex items-center justify-between rounded-lg bg-highlight px-3 py-2">
              <span className="text-sm font-semibold text-ink">Selected Invoice Total</span>
              <span className="font-bold text-ink">Rs. {checkedTotal.toFixed(2)}</span>
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-ink-muted">Payment Method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input">
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
          </>
        )}

        {error && <p className="mb-2 text-sm text-danger">{error}</p>}
        {success && <p className="mb-2 text-sm text-success">Collected Rs. {success.allocated_total} across {Object.keys(success.allocations).length} invoice(s).</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={submit} disabled={!canSubmit}>Pay Now</Button>
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
  const historyTotal = history.reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-ink">Credit Management</h1>
      <p className="mb-4 text-sm text-ink-muted">Customer credit balances and collections.</p>

      {canViewAll && (
        <div className="mb-4 card">
          <div className="flex items-center justify-between border-b border-border-soft px-4 py-3">
            <span className="font-semibold text-ink">Route Pending Credit Balances</span>
            <span className="text-sm font-medium text-ink-muted">Total pending: Rs. {routeTotal.toFixed(2)}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft text-left text-xs uppercase text-ink-muted">
                <th className="px-4 py-2">Customer</th><th className="px-4 py-2">Phone</th><th className="px-4 py-2">Unpaid Bills</th><th className="px-4 py-2">Total Due</th><th></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((c) => (
                <tr key={c.customer_id} className="border-b border-border-soft">
                  <td className="px-4 py-2">{c.ledger_name}</td>
                  <td className="px-4 py-2">{c.phone || '-'}</td>
                  <td className="px-4 py-2">{c.unpaid_invoice_count}</td>
                  <td className="px-4 py-2 font-medium text-danger">{c.total_due}</td>
                  <td className="px-4 py-2 text-right">
                    {canCollect && (
                      <button onClick={() => setSelected(c)} className="text-xs font-medium text-gold hover:underline">Collect</button>
                    )}
                  </td>
                </tr>
              ))}
              {pending.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-muted">No customers with an outstanding balance.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between border-b border-border-soft px-4 py-3">
          <span className="font-semibold text-ink">Past Collection Receipts</span>
          <span className="text-sm font-medium text-ink-muted">Total collected: Rs. {historyTotal.toFixed(2)}</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft text-left text-xs uppercase text-ink-muted">
              <th className="px-4 py-2">Receipt #</th><th className="px-4 py-2">Customer</th><th className="px-4 py-2">Amount</th><th className="px-4 py-2">Mode</th><th className="px-4 py-2">Collected By</th><th className="px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {history.map((c) => (
              <tr key={c.id} className="border-b border-border-soft">
                <td className="px-4 py-2">{c.receipt_no}</td>
                <td className="px-4 py-2">{c.customer_name}</td>
                <td className="px-4 py-2">{c.amount}</td>
                <td className="px-4 py-2 capitalize">{c.payment_method}</td>
                <td className="px-4 py-2 text-ink-muted">{c.collected_by_name}</td>
                <td className="px-4 py-2 text-ink-muted">{c.collected_at}</td>
              </tr>
            ))}
            {history.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-muted">No collections yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && <CollectModal customer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
