import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Search, Plus, X, CheckCircle2 } from 'lucide-react';
import { itemsApi } from '../api/catalog';
import { customersApi, suppliersApi } from '../api/parties';
import { salesReturnsApi, purchaseReturnsApi } from '../api/postsale';
import { invoicesApi } from '../api/invoices';
import { purchasesApi } from '../api/purchasing';
import { Tabs } from '../components/Tabs';
import { usePermission } from '../hooks/usePermission';
import { Button } from '../components/Button.jsx';

function ReturnLineEditor({ lines, setLines, items }) {
  const addLine = () => setLines((prev) => [...prev, { item_id: '', qty: 1, rate: 0 }]);
  const updateLine = (idx, patch) => setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-ink-muted block">Return Item Lines *</label>
      {lines.map((line, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <select
            value={line.item_id}
            onChange={(e) => updateLine(idx, { item_id: e.target.value })}
            className="input text-xs flex-1"
          >
            <option value="">Select Item</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.item_name}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="any"
            placeholder="Qty"
            value={line.qty}
            onChange={(e) => updateLine(idx, { qty: e.target.value })}
            className="input text-xs w-16"
          />
          <input
            type="number"
            step="any"
            placeholder="Rate"
            value={line.rate}
            onChange={(e) => updateLine(idx, { rate: e.target.value })}
            className="input text-xs w-20"
          />
          {lines.length > 1 && (
            <button
              type="button"
              onClick={() => removeLine(idx)}
              className="p-1 text-red-400 hover:text-red-300 transition"
              title="Remove Line"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addLine}
        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
      >
        + Add Another Item
      </button>
    </div>
  );
}

/**
 * Shows the original invoice/GRN's actual lines with what's already been
 * returned and what's left, so the user picks a quantity instead of
 * re-typing an item/rate that's already known (rules 9-10). Used for both
 * Sales Return (linkField="invoice_item_id") and Purchase Return
 * (linkField="purchase_item_id") — same shape, different source data.
 */
function TraceableReturnLines({ returnableItems, quantities, setQuantities, linkField, sourceLabel }) {
  if (!returnableItems) return null;
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-ink-muted block">Items on this {sourceLabel}</label>
      <div className="border border-border-soft rounded-lg divide-y divide-border-soft max-h-72 overflow-y-auto">
        {returnableItems.map((row) => {
          const lineId = row[linkField];
          const remaining = Number(row.remaining_qty);
          const qty = quantities[lineId] ?? '';
          return (
            <div key={lineId} className="flex items-center gap-2 p-2.5 text-xs">
              <div className="flex-1">
                <div className="font-medium text-ink">{row.item_name}</div>
                <div className="text-ink-muted">
                  Original {row.original_qty} · Already returned {row.already_returned_qty} · Remaining {remaining} @ Rs.{row.rate}
                </div>
              </div>
              <input
                type="number"
                step="any"
                min="0"
                max={remaining}
                placeholder="Qty"
                value={qty}
                disabled={remaining <= 0}
                onChange={(e) => setQuantities((prev) => ({ ...prev, [lineId]: e.target.value }))}
                className="input text-xs w-20 disabled:opacity-40"
              />
            </div>
          );
        })}
        {returnableItems.length === 0 && (
          <div className="p-3 text-center text-ink-muted text-xs">No lines found on this record.</div>
        )}
      </div>
    </div>
  );
}

/** Auto-follows the computed return total until the user types their own amount (partial refund), matching how PurchaseModel/InvoiceModel pricing defaults work — prefilled, never forced. */
function RefundAmountField({ returnTotal, refundAmount, setRefundAmount, touched, setTouched }) {
  useEffect(() => {
    if (!touched) setRefundAmount(returnTotal ? returnTotal.toFixed(2) : '');
  }, [returnTotal, touched, setRefundAmount]);

  const balance = returnTotal - Number(refundAmount || 0);

  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="text-xs font-medium text-ink-muted block mb-1">Return Total</label>
        <div className="input bg-surface-subtle/30 text-xs flex items-center">Rs. {returnTotal.toFixed(2)}</div>
      </div>
      <div>
        <label className="text-xs font-medium text-ink-muted block mb-1">Refund / Payment Amount</label>
        <input
          type="number"
          step="any"
          min="0"
          max={returnTotal}
          value={refundAmount}
          onChange={(e) => { setTouched(true); setRefundAmount(e.target.value); }}
          className="input text-xs w-full"
        />
      </div>
      {balance > 0.009 && (
        <div className="col-span-2 text-[11px] text-amber-400">Balance not refunded: Rs. {balance.toFixed(2)}</div>
      )}
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
  const [quantities, setQuantities] = useState({});
  const [refundAmount, setRefundAmount] = useState('');
  const [refundTouched, setRefundTouched] = useState(false);

  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const returnsQuery = useQuery({ queryKey: ['sales-returns'], queryFn: salesReturnsApi.list });
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: customersApi.list });
  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list('') });
  const returnableQuery = useQuery({
    queryKey: ['invoice-returnable-items', invoiceId],
    queryFn: () => invoicesApi.returnableItems(invoiceId),
    enabled: !!invoiceId,
  });
  const returnableItems = invoiceId ? returnableQuery.data : null;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sales-returns'] });

  const createMutation = useMutation({
    mutationFn: salesReturnsApi.create,
    onSuccess: () => {
      invalidate();
      resetForm();
      showSuccess('Sales return logged successfully!');
    },
  });

  const approveMutation = useMutation({
    mutationFn: salesReturnsApi.approve,
    onSuccess: () => {
      invalidate();
      showSuccess('Return approved.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: salesReturnsApi.reject,
    onSuccess: () => {
      invalidate();
      showSuccess('Return rejected.');
    },
  });

  const resetForm = () => {
    setInvoiceId('');
    setCustomerId('');
    setRefundAction('credit_note');
    setReason('');
    setLines([{ item_id: '', qty: 1, rate: 0 }]);
    setQuantities({});
    setRefundAmount('');
    setRefundTouched(false);
    setFormError('');
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const traceableLines = useMemo(() => {
    if (!returnableItems) return [];
    return returnableItems
      .map((row) => ({ item_id: row.item_id, invoice_item_id: row.invoice_item_id, qty: Number(quantities[row.invoice_item_id] || 0), rate: Number(row.rate) }))
      .filter((l) => l.qty > 0);
  }, [returnableItems, quantities]);

  const manualLines = useMemo(() => lines.filter((l) => l.item_id && Number(l.qty) > 0), [lines]);
  const activeLines = invoiceId ? traceableLines : manualLines;
  const returnTotal = useMemo(() => activeLines.reduce((s, l) => s + Number(l.qty) * Number(l.rate), 0), [activeLines]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (activeLines.length === 0) {
      setFormError('Please add at least one valid item line with a quantity.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        invoice_id: invoiceId ? Number(invoiceId) : null,
        customer_id: customerId ? Number(customerId) : null,
        refund_action: refundAction,
        reason: reason || null,
        refund_amount: refundAmount !== '' ? Number(refundAmount) : undefined,
        items: activeLines.map((l) => ({
          item_id: Number(l.item_id),
          qty: Number(l.qty),
          rate: Number(l.rate),
          invoice_item_id: l.invoice_item_id || undefined,
        })),
      });
    } catch (err) {
      setFormError(err?.response?.data?.error || 'Failed to save return');
    }
  };

  const returns = returnsQuery.data || [];
  const customers = customersQuery.data || [];
  const items = itemsQuery.data || [];

  const filteredReturns = returns.filter((r) => {
    return (
      r.return_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.invoice_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.status?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column Form */}
        <div className="lg:col-span-5">
          <div className="card p-5 space-y-4 sticky top-6">
            <div className="border-b border-border-soft pb-3">
              <h2 className="font-semibold text-ink text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                New Sales Return
              </h2>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Enter an Invoice # to pick exact lines and quantities; leave it blank for an untraceable return (requires approval).
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {formError && <div className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded border border-red-800/40">{formError}</div>}

              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Invoice ID (Optional)</label>
                <input
                  type="text"
                  placeholder="Invoice #"
                  value={invoiceId}
                  onChange={(e) => { setInvoiceId(e.target.value); setQuantities({}); setRefundTouched(false); }}
                  className="input w-full"
                />
                {invoiceId && returnableQuery.isError && (
                  <p className="text-[11px] text-red-400 mt-1">Could not load that invoice's items — check the Invoice ID.</p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Customer</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Walk-in / Unknown Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.ledger_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Refund Action</label>
                <select
                  value={refundAction}
                  onChange={(e) => setRefundAction(e.target.value)}
                  className="input w-full"
                >
                  <option value="credit_note">Credit Note</option>
                  <option value="cash_refund">Cash Refund</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Return Reason</label>
                <input
                  type="text"
                  placeholder="Defective, size mismatch, changed mind..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input w-full"
                />
              </div>

              {invoiceId ? (
                <TraceableReturnLines
                  returnableItems={returnableItems || []}
                  quantities={quantities}
                  setQuantities={setQuantities}
                  linkField="invoice_item_id"
                  sourceLabel="invoice"
                />
              ) : (
                <ReturnLineEditor lines={lines} setLines={setLines} items={items} />
              )}

              <RefundAmountField
                returnTotal={returnTotal}
                refundAmount={refundAmount}
                setRefundAmount={setRefundAmount}
                touched={refundTouched}
                setTouched={setRefundTouched}
              />

              {canCreate && (
                <div className="pt-2">
                  <Button type="submit" variant="primary" loading={createMutation.isPending} className="w-full">
                    Save Sales Return
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column Table */}
        <div className="lg:col-span-7 space-y-4">
          <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Search returns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 w-full text-xs"
              />
            </div>
            <span className="text-xs text-ink-muted">{filteredReturns.length} return record(s)</span>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-border-soft flex items-center justify-between">
              <h3 className="font-semibold text-ink text-sm">Sales Returns Log</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-soft bg-surface-subtle/30 text-ink-muted font-medium">
                    <th className="px-4 py-3">Return #</th>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Refund</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft/60">
                  {filteredReturns.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-subtle/20 transition">
                      <td className="px-4 py-3 font-mono font-medium text-ink">{r.return_no}</td>
                      <td className="px-4 py-3">
                        {r.invoice_no ? (
                          <span className="text-ink-muted font-mono">{r.invoice_no}</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Untraceable
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{r.customer_name || 'Walk-in'}</td>
                      <td className="px-4 py-3 capitalize text-ink-muted">{r.refund_action?.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-right font-medium text-ink">Rs. {Number(r.refund_amount ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3 capitalize">
                        {r.status === 'completed' || r.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            {r.status}
                          </span>
                        ) : r.status === 'pending_approval' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            Pending Approval
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                            {r.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.status === 'pending_approval' && canApprove && (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => approveMutation.mutate(r.id)}
                              className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold hover:bg-emerald-500/30"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => rejectMutation.mutate(r.id)}
                              className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-semibold hover:bg-red-500/30"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredReturns.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-ink-muted text-xs">
                        No sales returns logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PurchaseReturnsPanel({ canManage }) {
  const queryClient = useQueryClient();
  const [purchaseId, setPurchaseId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState([{ item_id: '', qty: 1, rate: 0 }]);
  const [quantities, setQuantities] = useState({});
  const [refundAmount, setRefundAmount] = useState('');
  const [refundTouched, setRefundTouched] = useState(false);

  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const returnsQuery = useQuery({ queryKey: ['purchase-returns'], queryFn: purchaseReturnsApi.list });
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: suppliersApi.list });
  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list('') });
  const returnableQuery = useQuery({
    queryKey: ['purchase-returnable-items', purchaseId],
    queryFn: () => purchasesApi.returnableItems(purchaseId),
    enabled: !!purchaseId,
  });
  const returnableItems = purchaseId ? returnableQuery.data : null;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['purchase-returns'] });

  const createMutation = useMutation({
    mutationFn: purchaseReturnsApi.create,
    onSuccess: () => {
      invalidate();
      resetForm();
      showSuccess('Purchase return logged successfully!');
    },
  });

  const resetForm = () => {
    setPurchaseId('');
    setSupplierId('');
    setReason('');
    setLines([{ item_id: '', qty: 1, rate: 0 }]);
    setQuantities({});
    setRefundAmount('');
    setRefundTouched(false);
    setFormError('');
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const traceableLines = useMemo(() => {
    if (!returnableItems) return [];
    return returnableItems
      .map((row) => ({ item_id: row.item_id, purchase_item_id: row.purchase_item_id, qty: Number(quantities[row.purchase_item_id] || 0), rate: Number(row.rate) }))
      .filter((l) => l.qty > 0);
  }, [returnableItems, quantities]);

  const manualLines = useMemo(() => lines.filter((l) => l.item_id && Number(l.qty) > 0), [lines]);
  const activeLines = purchaseId ? traceableLines : manualLines;
  const returnTotal = useMemo(() => activeLines.reduce((s, l) => s + Number(l.qty) * Number(l.rate), 0), [activeLines]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!supplierId) {
      setFormError('Please select a supplier.');
      return;
    }
    if (activeLines.length === 0) {
      setFormError('Please add at least one valid item line with a quantity.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        purchase_id: purchaseId ? Number(purchaseId) : null,
        supplier_id: Number(supplierId),
        reason: reason || null,
        refund_amount: refundAmount !== '' ? Number(refundAmount) : undefined,
        items: activeLines.map((l) => ({
          item_id: Number(l.item_id),
          qty: Number(l.qty),
          rate: Number(l.rate),
          purchase_item_id: l.purchase_item_id || undefined,
        })),
      });
    } catch (err) {
      setFormError(err?.response?.data?.error || 'Failed to save purchase return');
    }
  };

  const returns = returnsQuery.data || [];
  const suppliers = suppliersQuery.data || [];
  const items = itemsQuery.data || [];

  const filteredReturns = returns.filter((r) => {
    return (
      r.return_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.grn_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reason?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column Form */}
        <div className="lg:col-span-5">
          <div className="card p-5 space-y-4 sticky top-6">
            <div className="border-b border-border-soft pb-3">
              <h2 className="font-semibold text-ink text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                New Purchase Return
              </h2>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Enter a Purchase/GRN ID to pick exact lines and quantities.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {formError && <div className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded border border-red-800/40">{formError}</div>}

              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Purchase / GRN ID (Optional)</label>
                <input
                  type="text"
                  placeholder="Purchase #"
                  value={purchaseId}
                  onChange={(e) => { setPurchaseId(e.target.value); setQuantities({}); setRefundTouched(false); }}
                  className="input w-full"
                />
                {purchaseId && returnableQuery.isError && (
                  <p className="text-[11px] text-red-400 mt-1">Could not load that purchase's items — check the ID.</p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Supplier *</label>
                <select
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="input w-full"
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Return Reason</label>
                <input
                  type="text"
                  placeholder="Damaged batch, expired goods, wrong delivery..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input w-full"
                />
              </div>

              {purchaseId ? (
                <TraceableReturnLines
                  returnableItems={returnableItems || []}
                  quantities={quantities}
                  setQuantities={setQuantities}
                  linkField="purchase_item_id"
                  sourceLabel="GRN"
                />
              ) : (
                <ReturnLineEditor lines={lines} setLines={setLines} items={items} />
              )}

              <RefundAmountField
                returnTotal={returnTotal}
                refundAmount={refundAmount}
                setRefundAmount={setRefundAmount}
                touched={refundTouched}
                setTouched={setRefundTouched}
              />

              {canManage && (
                <div className="pt-2">
                  <Button type="submit" variant="primary" loading={createMutation.isPending} className="w-full">
                    Save Purchase Return
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column Table */}
        <div className="lg:col-span-7 space-y-4">
          <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Search purchase returns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 w-full text-xs"
              />
            </div>
            <span className="text-xs text-ink-muted">{filteredReturns.length} return record(s)</span>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-border-soft flex items-center justify-between">
              <h3 className="font-semibold text-ink text-sm">Purchase Returns History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-soft bg-surface-subtle/30 text-ink-muted font-medium">
                    <th className="px-4 py-3">Return #</th>
                    <th className="px-4 py-3">GRN #</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft/60">
                  {filteredReturns.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-subtle/20 transition">
                      <td className="px-4 py-3 font-mono font-medium text-ink">{r.return_no}</td>
                      <td className="px-4 py-3 font-mono text-ink-muted">{r.grn_no || '-'}</td>
                      <td className="px-4 py-3 font-medium text-ink">{r.supplier_name}</td>
                      <td className="px-4 py-3 text-right font-medium text-ink">Rs. {Number(r.refund_amount ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-ink-muted">{r.reason || '-'}</td>
                    </tr>
                  ))}
                  {filteredReturns.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-ink-muted text-xs">
                        No purchase returns recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Returns() {
  const canSalesReturn = usePermission('returns.sales_return');
  const canApprove = usePermission('returns.approve_untraceable_return');
  const canPurchaseReturn = usePermission('returns.purchase_return');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-soft/40 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <RotateCcw className="w-7 h-7 text-indigo-400" />
            Returns Management
          </h1>
          <p className="text-xs text-ink-muted mt-1">Manage customer sales returns, credit notes, and supplier returns</p>
        </div>
      </div>

      <Tabs
        tabs={[
          { key: 'sales', label: 'Sales Returns', content: <SalesReturnsPanel canCreate={canSalesReturn} canApprove={canApprove} /> },
          { key: 'purchase', label: 'Purchase Returns', content: <PurchaseReturnsPanel canManage={canPurchaseReturn} /> },
        ]}
      />
    </div>
  );
}
