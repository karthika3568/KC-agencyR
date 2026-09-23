import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Pencil, Trash2 } from 'lucide-react';
import { itemsApi } from '../api/catalog';
import { suppliersApi } from '../api/parties';
import { purchasesApi, supplierPaymentsApi } from '../api/purchasing';
import { Tabs } from '../components/Tabs';
import { Button } from '../components/Button.jsx';
import { usePermission } from '../hooks/usePermission';

/**
 * One priced purchase line — mirrors PurchaseModel::priceLine() exactly so
 * the on-screen preview matches what the server will actually save.
 * Free qty NEVER enters the money math; it only adds to received qty.
 */
function priceGrnLine(line) {
  const qty = Number(line.qty || 0);
  const freeQty = Number(line.free_qty || 0);
  const rate = Number(line.rate || 0);
  const gross = round2(qty * rate);
  const discountPercent = Number(line.discount_percent || 0);
  const discountAmount = line.discount_mode === 'amount' && line.discount_amount !== ''
    ? Number(line.discount_amount || 0)
    : round2((gross * discountPercent) / 100);
  const taxable = round2(gross - discountAmount);
  const taxPercent = Number(line.tax_percent || 0);
  const taxAmount = round2((taxable * taxPercent) / 100);
  return { qty, freeQty, totalQty: round2(qty + freeQty), gross, discountAmount, taxable, taxAmount, netAmount: round2(taxable + taxAmount) };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function PurchaseItemLineEditor({ lines, setLines, items, unitsByItemId, onPickItem }) {
  const addLine = () => setLines((prev) => [
    ...prev,
    { key: `${Date.now()}`, item_id: '', unit_id: '', qty: 1, free_qty: 0, mrp: '', rate: '', discount_mode: 'percent', discount_percent: 0, discount_amount: '', tax_percent: 0 },
  ]);
  const updateLine = (key, patch) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key) => setLines((prev) => prev.filter((l) => l.key !== key));

  return (
    <div className="flex flex-col gap-3">
      {lines.map((line) => {
        const item = items.find((i) => i.id === Number(line.item_id));
        const priced = priceGrnLine(line);
        const availableUnits = unitsByItemId[line.item_id] || (item ? [{ id: item.base_unit_id, short_code: item.base_unit_code }] : []);
        return (
          <div key={line.key} className="rounded-lg border border-border-soft p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <select
                value={line.item_id}
                onChange={(e) => {
                  const picked = items.find((i) => i.id === Number(e.target.value));
                  updateLine(line.key, {
                    item_id: e.target.value,
                    unit_id: picked ? picked.base_unit_id : '',
                    mrp: picked ? picked.mrp : '',
                    rate: picked ? picked.purchase_price : '',
                  });
                  if (picked) onPickItem(picked.id);
                }}
                className="input w-56"
              >
                <option value="">Select item</option>
                {items.map((i) => <option key={i.id} value={i.id}>{i.item_name} ({i.item_code})</option>)}
              </select>
              <select value={line.unit_id} onChange={(e) => updateLine(line.key, { unit_id: e.target.value })} className="input w-28">
                <option value="">Unit</option>
                {availableUnits.map((u) => <option key={u.id} value={u.id}>{u.short_code}</option>)}
              </select>
              <button onClick={() => removeLine(line.key)} className="ml-auto text-red-600"><X size={14} /></button>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <Field label="Qty">
                <input type="number" step="any" min="0" value={line.qty} onChange={(e) => updateLine(line.key, { qty: e.target.value })} className="input w-20" />
              </Field>
              <Field label="Free Qty">
                <input type="number" step="any" min="0" value={line.free_qty} onChange={(e) => updateLine(line.key, { free_qty: e.target.value })} className="input w-20" />
              </Field>
              <Field label="MRP">
                <input type="number" step="any" min="0" value={line.mrp} onChange={(e) => updateLine(line.key, { mrp: e.target.value })} className="input w-24" />
              </Field>
              <Field label="Purchase Price">
                <input type="number" step="any" min="0" value={line.rate} onChange={(e) => updateLine(line.key, { rate: e.target.value })} className="input w-24" />
              </Field>
              <Field label="Discount">
                <div className="flex items-center gap-1">
                  <div className="flex overflow-hidden rounded border border-border-soft">
                    <button type="button" onClick={() => updateLine(line.key, { discount_mode: 'percent' })} className={`px-1.5 py-1.5 text-xs font-medium ${line.discount_mode !== 'amount' ? 'bg-gold text-white' : 'bg-white text-ink-muted'}`}>%</button>
                    <button type="button" onClick={() => updateLine(line.key, { discount_mode: 'amount' })} className={`px-1.5 py-1.5 text-xs font-medium ${line.discount_mode === 'amount' ? 'bg-gold text-white' : 'bg-white text-ink-muted'}`}>Rs.</button>
                  </div>
                  {line.discount_mode === 'amount' ? (
                    <input type="number" step="any" min="0" value={line.discount_amount} onChange={(e) => updateLine(line.key, { discount_amount: e.target.value })} className="input w-20" />
                  ) : (
                    <input type="number" step="any" min="0" max="100" value={line.discount_percent} onChange={(e) => updateLine(line.key, { discount_percent: e.target.value })} className="input w-16" />
                  )}
                </div>
              </Field>
              <Field label="Tax %">
                <input type="number" step="any" min="0" value={line.tax_percent} onChange={(e) => updateLine(line.key, { tax_percent: e.target.value })} className="input w-16" />
              </Field>
            </div>

            <div className="mt-2 flex flex-wrap justify-between gap-2 rounded bg-page px-3 py-1.5 text-xs text-ink-muted">
              <span>Total Qty: <b className="text-ink">{priced.totalQty}</b></span>
              <span>Gross: <b className="text-ink">{priced.gross.toFixed(2)}</b></span>
              <span>Discount: <b className="text-ink">{priced.discountAmount.toFixed(2)}</b></span>
              <span>Net Amount: <b className="text-ink">{priced.netAmount.toFixed(2)}</b></span>
            </div>
          </div>
        );
      })}
      <button onClick={addLine} className="self-start text-xs font-medium text-gold hover:underline">+ Add line</button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

const emptyGrnLine = () => ({
  key: `${Date.now()}-${Math.random()}`, item_id: '', unit_id: '', qty: 1, free_qty: 0,
  mrp: '', rate: '', discount_mode: 'percent', discount_percent: 0, discount_amount: '', tax_percent: 0,
});

function GrnFormCard({ editing, onDone, items, unitsByItemId, onPickItem }) {
  const queryClient = useQueryClient();
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: suppliersApi.list });
  const [supplierId, setSupplierId] = useState(editing?.supplier_id ?? '');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState(editing?.supplier_invoice_no ?? '');
  const [paymentMode, setPaymentMode] = useState(editing?.payment_mode ?? 'credit');
  const [paidAmount, setPaidAmount] = useState(editing?.paid_amount ?? 0);
  const [lines, setLines] = useState(
    editing
      ? editing.items.map((it) => ({
          key: `${it.id}`, item_id: it.item_id, unit_id: it.unit_id, qty: Number(it.qty), free_qty: Number(it.free_qty),
          mrp: it.mrp ?? '', rate: Number(it.rate),
          discount_mode: Number(it.discount_amount) > 0 && Number(it.discount_percent) === 0 ? 'amount' : 'percent',
          discount_percent: Number(it.discount_percent), discount_amount: Number(it.discount_amount) || '',
          tax_percent: Number(it.tax_percent),
        }))
      : [emptyGrnLine()]
  );
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const suppliers = suppliersQuery.data || [];
  const isEdit = !!editing;

  const buildPayload = () => ({
    supplier_id: Number(supplierId),
    supplier_invoice_no: supplierInvoiceNo || null,
    payment_mode: paymentMode,
    paid_amount: Number(paidAmount || 0),
    items: lines.filter((l) => l.item_id).map((l) => ({
      item_id: Number(l.item_id),
      unit_id: l.unit_id ? Number(l.unit_id) : undefined,
      qty: Number(l.qty),
      free_qty: Number(l.free_qty || 0),
      mrp: l.mrp !== '' ? Number(l.mrp) : undefined,
      rate: Number(l.rate),
      ...(l.discount_mode === 'amount' ? { discount_amount: Number(l.discount_amount || 0) } : { discount_percent: Number(l.discount_percent || 0) }),
      tax_percent: Number(l.tax_percent || 0),
    })),
  });

  const createMutation = useMutation({
    mutationFn: purchasesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      setSupplierId(''); setSupplierInvoiceNo(''); setPaymentMode('credit'); setPaidAmount(0);
      setLines([emptyGrnLine()]);
      onDone();
    },
    onError: (err) => { setError(err?.response?.data?.error || 'Failed to save GRN'); setConfirming(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => purchasesApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchases'] }); onDone(); },
    onError: (err) => { setError(err?.response?.data?.error || 'Failed to update GRN'); setConfirming(false); },
  });

  const submit = () => {
    setError('');
    if (isEdit) updateMutation.mutate({ id: editing.id, data: buildPayload() });
    else createMutation.mutate(buildPayload());
  };

  const validLines = lines.filter((l) => l.item_id);
  const priced = validLines.map((l) => priceGrnLine(l));
  const totals = priced.reduce((acc, p) => ({
    qty: acc.qty + p.qty, freeQty: acc.freeQty + p.freeQty, totalQty: acc.totalQty + p.totalQty,
    gross: acc.gross + p.gross, discount: acc.discount + p.discountAmount, net: acc.net + p.netAmount,
  }), { qty: 0, freeQty: 0, totalQty: 0, gross: 0, discount: 0, net: 0 });

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold text-ink">{isEdit ? `Edit ${editing.grn_no}` : 'New GRN (Goods Received)'}</div>
        {isEdit && <button onClick={onDone} className="text-xs text-ink-muted hover:underline">Cancel edit</button>}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="input w-56" disabled={isEdit}>
          <option value="">Select supplier</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input placeholder="Supplier Invoice #" value={supplierInvoiceNo} onChange={(e) => setSupplierInvoiceNo(e.target.value)} className="input w-40" />
        <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="input w-32" disabled={isEdit}>
          <option value="credit">Credit</option>
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="upi">UPI</option>
        </select>
        <input type="number" step="any" placeholder="Paid amount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="input w-32" disabled={isEdit} />
      </div>

      <PurchaseItemLineEditor lines={lines} setLines={setLines} items={items} unitsByItemId={unitsByItemId} onPickItem={onPickItem} />

      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg bg-page p-3 text-sm sm:grid-cols-3">
        <SummaryStat label="Total Qty" value={totals.qty} />
        <SummaryStat label="Total Free Qty" value={totals.freeQty} />
        <SummaryStat label="Total Received" value={totals.totalQty} />
        <SummaryStat label="Gross Amount" value={totals.gross.toFixed(2)} />
        <SummaryStat label="Total Discount" value={totals.discount.toFixed(2)} />
        <SummaryStat label="Grand Total" value={totals.net.toFixed(2)} bold />
      </div>

      {confirming && isEdit ? (
        <div className="mt-3 rounded-lg bg-warning-bg px-3 py-3 text-sm text-warning">
          <p className="mb-2 font-medium">Are you sure you want to update this GRN?</p>
          <p className="mb-3 text-xs">Stock will be reversed and reapplied for the new quantities, and the supplier balance adjusted by the difference.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirming(false)} disabled={saving}>Back</Button>
            <Button size="sm" onClick={submit} disabled={saving}>Yes, Update GRN</Button>
          </div>
        </div>
      ) : (
        <Button className="mt-3" onClick={() => (isEdit ? setConfirming(true) : submit())} disabled={!supplierId || validLines.length === 0 || saving}>
          {isEdit ? 'Save Changes' : 'Save GRN & Update Stock'}
        </Button>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}

function SummaryStat({ label, value, bold }) {
  return (
    <div className="flex justify-between sm:block">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className={bold ? 'block text-base font-bold text-ink' : 'block font-semibold text-ink'}>{value}</span>
    </div>
  );
}

function GrnPanel({ canManage, canEdit, canViewCost, canDelete }) {
  const queryClient = useQueryClient();
  const [editingGrn, setEditingGrn] = useState(undefined); // undefined = create form, object = editing
  const [unitsByItemId, setUnitsByItemId] = useState({});

  const purchasesQuery = useQuery({ queryKey: ['purchases'], queryFn: purchasesApi.list });
  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list('') });

  const deleteMutation = useMutation({
    mutationFn: purchasesApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchases'] }),
  });

  const onPickItem = async (itemId) => {
    if (unitsByItemId[itemId]) return;
    const full = await itemsApi.get(itemId);
    const purchaseUnits = (full.unit_conversions || []).filter((uc) => Number(uc.is_purchase_unit));
    const options = [{ id: full.base_unit_id, short_code: full.base_unit_code }, ...purchaseUnits.map((uc) => ({ id: uc.unit_id, short_code: uc.short_code }))];
    setUnitsByItemId((prev) => ({ ...prev, [itemId]: options }));
  };

  const openEdit = async (p) => setEditingGrn(await purchasesApi.get(p.id));

  const purchases = purchasesQuery.data || [];
  const items = itemsQuery.data || [];

  return (
    <div className="flex flex-col gap-4">
      {(canManage || editingGrn) && (
        <GrnFormCard
          key={editingGrn?.id ?? 'create'}
          editing={editingGrn}
          onDone={() => setEditingGrn(undefined)}
          items={items}
          unitsByItemId={unitsByItemId}
          onPickItem={onPickItem}
        />
      )}

      <div className="card">
        <div className="border-b border-border-soft px-4 py-3 font-semibold text-ink">GRN Register</div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft text-left text-xs uppercase text-ink-muted">
              <th className="px-4 py-2">GRN #</th><th className="px-4 py-2">Supplier Inv #</th><th className="px-4 py-2">Supplier</th>
              <th className="px-4 py-2">Date</th>
              {canViewCost && <th className="px-4 py-2">Grand Total</th>}
              {canViewCost && <th className="px-4 py-2">Paid</th>}
              {canViewCost && <th className="px-4 py-2">Pending</th>}
              <th className="px-4 py-2">Mode</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Actions</th>
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
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-2">
                    {canEdit && p.status === 'active' && (
                      <button title="Edit" onClick={() => openEdit(p)} className="text-ink-muted hover:text-gold"><Pencil size={15} /></button>
                    )}
                    {canDelete && p.status === 'active' && (
                      <button title="Delete" onClick={() => deleteMutation.mutate(p.id)} className="text-danger hover:text-red-700"><Trash2 size={15} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {purchases.length === 0 && <tr><td colSpan={9} className="px-4 py-6 text-center text-ink-muted">No GRNs yet.</td></tr>}
          </tbody>
        </table>
        </div>
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
  const canEditGrn = usePermission('purchases.edit_grn');
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
          { key: 'grn', label: 'GRN (Purchases)', content: <GrnPanel canManage={canGrn} canEdit={canEditGrn} canViewCost={canViewCost} canDelete={canDeleteGrn} /> },
          { key: 'payments', label: 'Supplier Payments', content: <SupplierPaymentsPanel canManage={canSettle} /> },
        ]}
      />
    </div>
  );
}
