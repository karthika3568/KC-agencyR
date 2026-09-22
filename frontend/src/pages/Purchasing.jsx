import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { itemsApi } from '../api/catalog';
import { suppliersApi } from '../api/parties';
import { purchasesApi, supplierPaymentsApi } from '../api/purchasing';
import { Tabs } from '../components/Tabs';
import { usePermission } from '../hooks/usePermission';

function ItemLineEditor({ lines, setLines, items, showTax }) {
  const addLine = () => setLines((prev) => [...prev, { item_id: '', qty: 1, rate: 0, tax_percent: 0, free_qty: 0 }]);
  const updateLine = (idx, patch) => setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="flex flex-col gap-2">
      {lines.map((line, idx) => (
        <div key={idx} className="flex flex-wrap items-center gap-2">
          <select value={line.item_id} onChange={(e) => updateLine(idx, { item_id: e.target.value })} className="input w-48">
            <option value="">Select item</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.item_name}</option>)}
          </select>
          <input type="number" step="any" placeholder="Qty" value={line.qty} onChange={(e) => updateLine(idx, { qty: e.target.value })} className="input w-20" />
          <input type="number" step="any" placeholder="Rate" value={line.rate} onChange={(e) => updateLine(idx, { rate: e.target.value })} className="input w-24" />
          {showTax && (
            <input type="number" step="any" placeholder="Tax %" value={line.tax_percent} onChange={(e) => updateLine(idx, { tax_percent: e.target.value })} className="input w-20" />
          )}
          {showTax && (
            <input type="number" step="any" placeholder="Free qty" value={line.free_qty} onChange={(e) => updateLine(idx, { free_qty: e.target.value })} className="input w-24" />
          )}
          <button onClick={() => removeLine(idx)} className="text-red-600"><X size={14} /></button>
        </div>
      ))}
      <button onClick={addLine} className="self-start text-xs font-medium text-gold hover:underline">+ Add line</button>
    </div>
  );
}

function GrnPanel({ canManage, canViewCost, canDelete }) {
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [paymentMode, setPaymentMode] = useState('credit');
  const [paidAmount, setPaidAmount] = useState(0);
  const [lines, setLines] = useState([{ item_id: '', qty: 1, rate: 0, tax_percent: 0, free_qty: 0 }]);
  const [error, setError] = useState('');

  const purchasesQuery = useQuery({ queryKey: ['purchases'], queryFn: purchasesApi.list });
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: suppliersApi.list });
  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list('') });

  const createMutation = useMutation({
    mutationFn: purchasesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      setSupplierId(''); setSupplierInvoiceNo(''); setPaidAmount(0);
      setLines([{ item_id: '', qty: 1, rate: 0, tax_percent: 0, free_qty: 0 }]);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: purchasesApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchases'] }),
  });

  const submit = async () => {
    setError('');
    try {
      await createMutation.mutateAsync({
        supplier_id: Number(supplierId),
        supplier_invoice_no: supplierInvoiceNo || null,
        payment_mode: paymentMode,
        paid_amount: Number(paidAmount || 0),
        items: lines.filter((l) => l.item_id).map((l) => ({
          item_id: Number(l.item_id), qty: Number(l.qty), rate: Number(l.rate),
          tax_percent: Number(l.tax_percent || 0), free_qty: Number(l.free_qty || 0),
        })),
      });
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save GRN');
    }
  };

  const purchases = purchasesQuery.data || [];
  const suppliers = suppliersQuery.data || [];
  const items = itemsQuery.data || [];

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="card p-4">
          <div className="mb-2 font-semibold text-ink">New GRN (Goods Received)</div>
          <div className="mb-2 flex flex-wrap gap-2">
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="input w-56">
              <option value="">Select supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input placeholder="Supplier Invoice #" value={supplierInvoiceNo} onChange={(e) => setSupplierInvoiceNo(e.target.value)} className="input w-40" />
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="input w-32">
              <option value="credit">Credit</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="upi">UPI</option>
            </select>
            <input type="number" step="any" placeholder="Paid amount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="input w-32" />
          </div>
          <ItemLineEditor lines={lines} setLines={setLines} items={items} showTax />
          <button onClick={submit} disabled={!supplierId} className="mt-3 rounded bg-success px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40">
            Save GRN &amp; Update Stock
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      <div className="card">
        <div className="border-b border-border-soft px-4 py-3 font-semibold text-ink">GRN Register</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft text-left text-xs uppercase text-ink-muted">
              <th className="px-4 py-2">GRN #</th><th className="px-4 py-2">Supplier Inv #</th><th className="px-4 py-2">Supplier</th>
              <th className="px-4 py-2">Date</th>
              {canViewCost && <th className="px-4 py-2">Grand Total</th>}
              {canViewCost && <th className="px-4 py-2">Paid</th>}
              {canViewCost && <th className="px-4 py-2">Pending</th>}
              <th className="px-4 py-2">Mode</th><th className="px-4 py-2">Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id} className={`border-b border-border-soft ${p.status === 'cancelled' ? 'opacity-50 line-through' : ''}`}>
                <td className="px-4 py-2">{p.grn_no}</td>
                <td className="px-4 py-2">{p.supplier_invoice_no || '-'}</td>
                <td className="px-4 py-2">{p.supplier_name}</td>
                <td className="px-4 py-2 text-ink-muted">{p.purchase_date}</td>
                {canViewCost && <td className="px-4 py-2">{p.grand_total}</td>}
                {canViewCost && <td className="px-4 py-2">{p.paid_amount}</td>}
                {canViewCost && (
                  <td className={`px-4 py-2 font-medium ${Number(p.pending_balance) > 0 ? 'text-red-600' : 'text-success'}`}>
                    {p.pending_balance}
                  </td>
                )}
                <td className="px-4 py-2 capitalize">{p.payment_mode.replace('_', ' ')}</td>
                <td className="px-4 py-2 capitalize">{p.status}</td>
                <td className="px-4 py-2 text-right">
                  {canDelete && p.status === 'active' && (
                    <button onClick={() => deleteMutation.mutate(p.id)} className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {purchases.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-ink-muted">No GRNs yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SupplierPaymentsPanel({ canManage }) {
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('bank_transfer');
  const [referenceNo, setReferenceNo] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: suppliersApi.list });
  const unpaidQuery = useQuery({
    queryKey: ['unpaid-grns', supplierId],
    queryFn: () => supplierPaymentsApi.unpaidGrns(supplierId),
    enabled: !!supplierId,
  });
  const paymentsQuery = useQuery({ queryKey: ['supplier-payments'], queryFn: supplierPaymentsApi.list });

  const createMutation = useMutation({
    mutationFn: supplierPaymentsApi.create,
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['unpaid-grns', supplierId] });
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    },
  });

  const unpaid = unpaidQuery.data || [];
  const suppliers = suppliersQuery.data || [];
  const payments = paymentsQuery.data || [];

  // Live FIFO preview, mirrors the server's default allocation.
  const preview = (() => {
    let remaining = Number(amount || 0);
    return unpaid.map((grn) => {
      const pending = Number(grn.pending_balance);
      const applied = Math.max(0, Math.min(remaining, pending));
      remaining -= applied;
      return { ...grn, applied, remAfter: pending - applied };
    });
  })();

  const submit = async () => {
    setError('');
    setResult(null);
    try {
      await createMutation.mutateAsync({
        supplier_id: Number(supplierId),
        amount: Number(amount),
        payment_mode: paymentMode,
        reference_no: referenceNo || null,
      });
      setAmount('');
      setReferenceNo('');
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to record payment');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="card p-4">
          <div className="mb-2 font-semibold text-ink">Record Supplier Payment</div>
          <div className="mb-3 flex flex-wrap gap-2">
            <select value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setResult(null); }} className="input w-56">
              <option value="">Select supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="number" step="any" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="input w-32" />
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="input w-36">
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="cheque">Cheque</option>
            </select>
            <input placeholder="Reference #" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} className="input w-32" />
          </div>

          {supplierId && (
            <div className="mb-3 overflow-hidden rounded border border-border-soft">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-page text-left text-ink-muted">
                    <th className="px-3 py-1.5">GRN #</th><th className="px-3 py-1.5">Pending</th><th className="px-3 py-1.5">This Pay (FIFO)</th><th className="px-3 py-1.5">Rem After</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((g) => (
                    <tr key={g.id}>
                      <td className="px-3 py-1.5">{g.grn_no}</td>
                      <td className="px-3 py-1.5">{g.pending_balance}</td>
                      <td className="px-3 py-1.5 font-medium text-gold">{g.applied.toFixed(2)}</td>
                      <td className="px-3 py-1.5">{g.remAfter.toFixed(2)}</td>
                    </tr>
                  ))}
                  {unpaid.length === 0 && <tr><td colSpan={4} className="px-3 py-3 text-center text-ink-muted">No outstanding GRNs.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          <button onClick={submit} disabled={!supplierId || !amount} className="rounded bg-success px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40">
            Settle Supplier Balance
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {result && <p className="mt-2 text-sm text-success">Allocated Rs. {result.allocated_total} across {Object.keys(result.allocations).length} GRN(s).</p>}
        </div>
      )}

      <div className="card">
        <div className="border-b border-border-soft px-4 py-3 font-semibold text-ink">Supplier Payment Register</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft text-left text-xs uppercase text-ink-muted">
              <th className="px-4 py-2">Code</th><th className="px-4 py-2">Supplier</th><th className="px-4 py-2">Mode</th><th className="px-4 py-2">Reference</th><th className="px-4 py-2">Amount</th><th className="px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-border-soft">
                <td className="px-4 py-2">{p.payment_code}</td>
                <td className="px-4 py-2">{p.supplier_name}</td>
                <td className="px-4 py-2 capitalize">{p.payment_mode.replace('_', ' ')}</td>
                <td className="px-4 py-2">{p.reference_no || '-'}</td>
                <td className="px-4 py-2">{p.amount}</td>
                <td className="px-4 py-2 text-ink-muted">{p.paid_at}</td>
              </tr>
            ))}
            {payments.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-muted">No payments yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Purchasing() {
  const canGrn = usePermission('purchases.create_grn');
  const canDeleteGrn = usePermission('purchases.delete_grn');
  const canViewCost = usePermission('purchases.view_purchase_cost');
  const canSettle = usePermission('purchases.settle_supplier_payment');

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-ink">Purchasing</h1>
      <p className="mb-4 text-sm text-ink-muted">
        Purchase indents/requests now live under Orders &amp; Indents Management.
      </p>
      <Tabs
        tabs={[
          { key: 'grn', label: 'GRN (Purchases)', content: <GrnPanel canManage={canGrn} canViewCost={canViewCost} canDelete={canDeleteGrn} /> },
          { key: 'payments', label: 'Supplier Payments', content: <SupplierPaymentsPanel canManage={canSettle} /> },
        ]}
      />
    </div>
  );
}
