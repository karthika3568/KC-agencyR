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
import { Pagination } from '../components/Pagination';
import { useClientPagination } from '../hooks/useClientPagination';

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
function formatQty(val) {
  const num = Number(val || 0);
  if (isNaN(num)) return '0';
  return Number.isInteger(num) ? String(num) : String(parseFloat(num.toFixed(3)));
}

/**
 * Shows the original invoice/GRN's actual lines in a clean, cashier-friendly layout.
 * Used for both Sales Return (linkField="invoice_item_id") and Purchase Return
 * (linkField="purchase_item_id").
 */
function TraceableReturnLines({ returnableItems, quantities, setQuantities, linkField, sourceLabel }) {
  if (!returnableItems) return null;

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-ink-muted block">Items on this {sourceLabel}</label>
      <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
        {returnableItems.map((row) => {
          const lineId = row[linkField];
          const origQty = Number(row.original_qty || 0);
          const alreadyReturned = Number(row.already_returned_qty || 0);
          const remaining = Number(row.remaining_qty || 0);
          const isFullyReturned = remaining <= 0;
          const isWholeUnit = Number.isInteger(origQty) && Number.isInteger(remaining);
          const step = isWholeUnit ? '1' : 'any';

          const qty = quantities[lineId] ?? '';
          const numQty = Number(qty || 0);
          const rate = Number(row.rate || 0);
          const lineReturnAmount = numQty * rate;

          const updateQty = (nextVal) => {
            if (nextVal === '' || nextVal === null || nextVal === undefined) {
              setQuantities((prev) => ({ ...prev, [lineId]: '' }));
              return;
            }
            let n = Number(nextVal);
            if (isNaN(n) || n < 0) n = 0;
            if (n > remaining) n = remaining;
            if (isWholeUnit) n = Math.floor(n);
            const formatted = n > 0 ? (isWholeUnit ? String(n) : String(parseFloat(n.toFixed(3)))) : '';
            setQuantities((prev) => ({ ...prev, [lineId]: formatted }));
          };

          const handleDecrement = () => {
            const delta = isWholeUnit ? 1 : 0.5;
            const next = Math.max(0, numQty - delta);
            updateQty(next === 0 ? '' : next);
          };

          const handleIncrement = () => {
            const delta = isWholeUnit ? 1 : 0.5;
            const next = Math.min(remaining, numQty + delta);
            updateQty(next);
          };

          const handleInputChange = (e) => {
            const val = e.target.value;
            if (val === '') {
              setQuantities((prev) => ({ ...prev, [lineId]: '' }));
              return;
            }
            let n = Number(val);
            if (isNaN(n)) return;
            if (n < 0) n = 0;
            if (n > remaining) n = remaining;
            setQuantities((prev) => ({
              ...prev,
              [lineId]: val === '' ? '' : (Number(val) > remaining ? String(remaining) : val),
            }));
          };

          const handleBlur = () => {
            if (qty !== '') {
              updateQty(qty);
            }
          };

          return (
            <div
              key={lineId}
              className={`p-3 rounded-lg border transition ${
                isFullyReturned
                  ? 'bg-surface-subtle/20 border-border-soft/60'
                  : numQty > 0
                  ? 'bg-indigo-500/5 border-indigo-500/30'
                  : 'bg-surface-subtle/40 border-border-soft hover:border-border-strong'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink text-xs sm:text-sm flex items-center gap-2">
                    <span className="truncate">{row.item_name}</span>
                    {isFullyReturned && (
                      <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                        Already fully returned
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-ink-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span>
                      Price: <strong className="text-ink font-medium">₹{rate.toFixed(2)}</strong>
                    </span>
                    {alreadyReturned > 0 ? (
                      remaining > 0 ? (
                        <span className="text-amber-400 font-medium">
                          Purchased: {formatQty(origQty)} | Available to return: {formatQty(remaining)}
                        </span>
                      ) : null
                    ) : (
                      <span>
                        Purchased Qty: <strong className="text-ink font-medium">{formatQty(origQty)}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-1.5 pt-1 sm:pt-0 border-t sm:border-t-0 border-border-soft/40">
                  {!isFullyReturned ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-ink-muted">Return Qty:</span>
                      <div className="inline-flex items-center rounded border border-border-soft bg-surface overflow-hidden">
                        <button
                          type="button"
                          disabled={numQty <= 0}
                          onClick={handleDecrement}
                          className="w-7 h-7 flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-subtle disabled:opacity-30 disabled:pointer-events-none transition text-sm font-semibold select-none"
                          title="Decrease Quantity"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          step={step}
                          min="0"
                          max={remaining}
                          value={qty}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          placeholder="0"
                          className="w-12 h-7 text-center text-xs font-semibold text-ink bg-transparent focus:outline-none border-x border-border-soft disabled:opacity-40"
                        />
                        <button
                          type="button"
                          disabled={numQty >= remaining}
                          onClick={handleIncrement}
                          className="w-7 h-7 flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-subtle disabled:opacity-30 disabled:pointer-events-none transition text-sm font-semibold select-none"
                          title="Increase Quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {numQty > 0 && (
                    <div className="text-xs font-semibold text-emerald-400">
                      Return Amount: ₹{lineReturnAmount.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {returnableItems.length === 0 && (
          <div className="p-4 text-center text-ink-muted text-xs border border-dashed border-border-soft rounded-lg">
            No lines found on this record.
          </div>
        )}
      </div>
    </div>
  );
}

/** Auto-follows the computed return total until the user types their own amount (partial refund). */
function RefundAmountField({ returnTotal, refundAmount, setRefundAmount, touched, setTouched }) {
  useEffect(() => {
    if (!touched) setRefundAmount(returnTotal ? returnTotal.toFixed(2) : '');
  }, [returnTotal, touched, setRefundAmount]);

  const balance = returnTotal - Number(refundAmount || 0);

  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="text-xs font-medium text-ink-muted block mb-1">Return Total</label>
        <div className="input bg-surface-subtle/30 text-xs flex items-center font-semibold text-emerald-400">
          ₹{returnTotal.toFixed(2)}
        </div>
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
        <div className="col-span-2 text-[11px] text-amber-400">Balance not refunded: ₹{balance.toFixed(2)}</div>
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

  const trimmedInvoice = invoiceId.trim();

  const returnsQuery = useQuery({ queryKey: ['sales-returns'], queryFn: salesReturnsApi.list });
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: customersApi.list });
  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list('') });
  const returnableQuery = useQuery({
    queryKey: ['invoice-returnable-items', trimmedInvoice],
    queryFn: () => invoicesApi.returnableItems(trimmedInvoice),
    enabled: !!trimmedInvoice,
    retry: false,
  });

  const returnableData = trimmedInvoice ? returnableQuery.data : null;

  const resolvedInvoice = useMemo(() => {
    if (!returnableData) return null;
    if (returnableData.invoice) return returnableData.invoice;
    if (Array.isArray(returnableData) && returnableData.length > 0) {
      return {
        id: returnableData[0].invoice_id,
        invoice_no: returnableData[0].invoice_no,
        customer_id: returnableData[0].customer_id,
        customer_name: returnableData[0].customer_name,
      };
    }
    return null;
  }, [returnableData]);

  const returnableItems = useMemo(() => {
    if (!returnableData) return null;
    if (Array.isArray(returnableData)) return returnableData;
    return returnableData.items || [];
  }, [returnableData]);

  const resolvedInvoiceId = resolvedInvoice?.id ?? (/^\d+$/.test(trimmedInvoice) ? Number(trimmedInvoice) : null);

  useEffect(() => {
    if (resolvedInvoice) {
      if (resolvedInvoice.customer_id) {
        setCustomerId(String(resolvedInvoice.customer_id));
      } else {
        setCustomerId('');
      }
    }
  }, [resolvedInvoice]);

  useEffect(() => {
    if (returnableItems && returnableItems.length === 1) {
      const single = returnableItems[0];
      const remaining = Number(single.remaining_qty || 0);
      const lineId = single.invoice_item_id;
      if (lineId && remaining > 0) {
        setQuantities((prev) => {
          if (prev[lineId] !== undefined) return prev;
          return { [lineId]: formatQty(remaining) };
        });
      }
    }
  }, [returnableItems]);

  const customerMismatch = useMemo(() => {
    if (!resolvedInvoice || !customerId) return false;
    const invoiceCustId = resolvedInvoice.customer_id ? String(resolvedInvoice.customer_id) : '';
    return String(customerId) !== invoiceCustId;
  }, [resolvedInvoice, customerId]);

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
    if (trimmedInvoice && !resolvedInvoiceId && !returnableQuery.isLoading) {
      setFormError('Please resolve a valid invoice before saving, or clear the invoice field for an untraceable return.');
      return;
    }
    if (activeLines.length === 0) {
      setFormError('Please add at least one valid item line with a quantity.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        invoice_id: resolvedInvoiceId ? Number(resolvedInvoiceId) : null,
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

  const {
    page,
    setPage,
    total,
    paginatedItems: paginatedReturns,
    resetPage,
  } = useClientPagination(filteredReturns, 10);

  useEffect(() => {
    resetPage();
  }, [searchQuery, resetPage]);

  return (
    <div className="space-y-2.5">
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
        {/* Left Column Form */}
        <div className="lg:col-span-5">
          <div className="card p-3.5 space-y-2.5 sticky top-3">
            <div className="border-b border-border-soft pb-2">
              <h2 className="font-semibold text-ink text-sm sm:text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                New Sales Return
              </h2>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Enter an Invoice # to pick exact lines and quantities; leave blank for untraceable return.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2">
              {formError && <div className="text-xs text-red-400 bg-red-950/40 p-2 rounded border border-red-800/40">{formError}</div>}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-ink-muted block mb-0.5">Invoice ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="Invoice #"
                    value={invoiceId}
                    onChange={(e) => { setInvoiceId(e.target.value); setQuantities({}); setRefundTouched(false); }}
                    className="input w-full"
                  />
                  {trimmedInvoice && returnableQuery.isLoading && (
                    <p className="text-[10px] text-ink-muted mt-0.5">Checking invoice...</p>
                  )}
                  {trimmedInvoice && returnableQuery.isError && (
                    <p className="text-[10px] text-red-400 mt-0.5">
                      {returnableQuery.error?.response?.data?.error === 'Not found'
                        ? 'Invoice not found in your branch.'
                        : (returnableQuery.error?.response?.data?.error || 'Could not load that invoice items.')}
                    </p>
                  )}
                  {trimmedInvoice && returnableItems && returnableItems.length > 0 && returnableItems.every((i) => Number(i.remaining_qty) <= 0) && (
                    <p className="text-[10px] text-amber-400 mt-0.5">
                      All items on this invoice have already been returned.
                    </p>
                  )}
                  {trimmedInvoice && returnableItems && returnableItems.length === 0 && !returnableQuery.isLoading && !returnableQuery.isError && (
                    <p className="text-[10px] text-amber-400 mt-0.5">
                      No items found on this invoice.
                    </p>
                  )}
                  {resolvedInvoice && (
                    <p className="text-[10px] text-emerald-400 mt-0.5">
                      ✓ Linked to {resolvedInvoice.invoice_no || `Invoice #${resolvedInvoice.id}`} ({resolvedInvoice.customer_name || 'Walk-in'})
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-ink-muted block mb-0.5">Customer</label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">Walk-in / Unknown</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.ledger_name}
                      </option>
                    ))}
                  </select>
                  {customerMismatch && (
                    <p className="text-[10px] text-amber-400 mt-0.5">
                      Selected customer differs from invoice ({resolvedInvoice?.customer_name || 'Walk-in'}).
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-ink-muted block mb-0.5">Refund Action</label>
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
                  <label className="text-xs font-medium text-ink-muted block mb-0.5">Return Reason</label>
                  <input
                    type="text"
                    placeholder="Defective, size mismatch..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="input w-full"
                  />
                </div>
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
                <div className="pt-1">
                  <Button type="submit" variant="primary" loading={createMutation.isPending} className="w-full">
                    Save Sales Return
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column Table */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="card p-2.5 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Search returns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-8 w-full text-xs"
              />
            </div>
            <span className="text-xs text-ink-muted">{filteredReturns.length} return record(s)</span>
          </div>

          <div className="card overflow-hidden">
            <div className="px-3.5 py-2 border-b border-border-soft flex items-center justify-between">
              <h3 className="font-semibold text-ink text-xs sm:text-sm">Sales Returns Log</h3>
            </div>
            <div className="max-h-[calc(100vh-240px)] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-page z-10">
                  <tr className="border-b border-border-soft uppercase text-ink-muted font-medium">
                    <th className="px-3 py-1.5">Return #</th>
                    <th className="px-3 py-1.5">Invoice</th>
                    <th className="px-3 py-1.5">Customer</th>
                    <th className="px-3 py-1.5">Refund</th>
                    <th className="px-3 py-1.5 text-right">Amount</th>
                    <th className="px-3 py-1.5">Status</th>
                    <th className="px-3 py-1.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft/60">
                  {paginatedReturns.map((r) => (
                    <tr key={r.id} className="hover:bg-page/50 transition">
                      <td className="px-3 py-1.5 font-mono font-medium text-ink">{r.return_no}</td>
                      <td className="px-3 py-1.5">
                        {r.invoice_no ? (
                          <span className="text-ink-muted font-mono">{r.invoice_no}</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Untraceable
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-ink-muted">{r.customer_name || 'Walk-in'}</td>
                      <td className="px-3 py-1.5 capitalize text-ink-muted">{r.refund_action?.replace('_', ' ')}</td>
                      <td className="px-3 py-1.5 text-right font-medium text-ink">Rs. {Number(r.refund_amount ?? 0).toFixed(2)}</td>
                      <td className="px-3 py-1.5 capitalize">
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
            <Pagination page={page} pageSize={10} total={total} onPageChange={setPage} />
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

  const {
    page,
    setPage,
    total,
    paginatedItems: paginatedReturns,
    resetPage,
  } = useClientPagination(filteredReturns, 10);

  useEffect(() => {
    resetPage();
  }, [searchQuery, resetPage]);

  return (
    <div className="space-y-2.5">
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
        {/* Left Column Form */}
        <div className="lg:col-span-5">
          <div className="card p-3.5 space-y-2.5 sticky top-3">
            <div className="border-b border-border-soft pb-2">
              <h2 className="font-semibold text-ink text-sm sm:text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                New Purchase Return
              </h2>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Enter a Purchase/GRN ID to pick exact lines and quantities.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2">
              {formError && <div className="text-xs text-red-400 bg-red-950/40 p-2 rounded border border-red-800/40">{formError}</div>}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-ink-muted block mb-0.5">Purchase / GRN ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="Purchase #"
                    value={purchaseId}
                    onChange={(e) => { setPurchaseId(e.target.value); setQuantities({}); setRefundTouched(false); }}
                    className="input w-full"
                  />
                  {purchaseId && returnableQuery.isError && (
                    <p className="text-[10px] text-red-400 mt-0.5">Could not load purchase items.</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-ink-muted block mb-0.5">Supplier *</label>
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
              </div>

              <div>
                <label className="text-xs font-medium text-ink-muted block mb-0.5">Return Reason</label>
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
                <div className="pt-1">
                  <Button type="submit" variant="primary" loading={createMutation.isPending} className="w-full">
                    Save Purchase Return
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column Table */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="card p-2.5 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Search purchase returns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-8 w-full text-xs"
              />
            </div>
            <span className="text-xs text-ink-muted">{filteredReturns.length} return record(s)</span>
          </div>

          <div className="card overflow-hidden">
            <div className="px-3.5 py-2 border-b border-border-soft flex items-center justify-between">
              <h3 className="font-semibold text-ink text-xs sm:text-sm">Purchase Returns History</h3>
            </div>
            <div className="max-h-[calc(100vh-240px)] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-page z-10">
                  <tr className="border-b border-border-soft uppercase text-ink-muted font-medium">
                    <th className="px-3 py-1.5">Return #</th>
                    <th className="px-3 py-1.5">GRN #</th>
                    <th className="px-3 py-1.5">Supplier</th>
                    <th className="px-3 py-1.5 text-right">Amount</th>
                    <th className="px-3 py-1.5">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft/60">
                  {paginatedReturns.map((r) => (
                    <tr key={r.id} className="hover:bg-page/50 transition">
                      <td className="px-3 py-1.5 font-mono font-medium text-ink">{r.return_no}</td>
                      <td className="px-3 py-1.5 font-mono text-ink-muted">{r.grn_no || '-'}</td>
                      <td className="px-3 py-1.5 font-medium text-ink">{r.supplier_name}</td>
                      <td className="px-3 py-1.5 text-right font-medium text-ink">Rs. {Number(r.refund_amount ?? 0).toFixed(2)}</td>
                      <td className="px-3 py-1.5 text-ink-muted">{r.reason || '-'}</td>
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
            <Pagination page={page} pageSize={10} total={total} onPageChange={setPage} />
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
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-soft/40 pb-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-indigo-400" />
            Returns Management
          </h1>
          <p className="text-[11px] text-ink-muted mt-0.5">Manage customer sales returns, credit notes, and supplier returns</p>
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
