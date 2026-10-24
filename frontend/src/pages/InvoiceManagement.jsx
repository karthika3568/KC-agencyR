import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Printer, Ban, Search, Pencil, Trash2 } from 'lucide-react';
import { invoicesApi } from '../api/invoices';
import { itemsApi } from '../api/catalog';
import { customersApi } from '../api/parties';
import { priceLine, computeCartTotals } from '../utils/pricing';
import { Card } from '../components/Card.jsx';
import { Badge } from '../components/Badge.jsx';
import { Button } from '../components/Button.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { PrintPreviewModal } from '../components/PrintPreviewModal.jsx';
import { usePermission } from '../hooks/usePermission';

const STATUS_VARIANT = {
  paid: 'success', partial: 'warning', credit: 'gold', cancelled: 'danger', returned: 'danger',
};

const GST_STATUS_VARIANT = {
  not_generated: 'neutral', generated: 'success', failed: 'danger', cancelled: 'danger',
};
const GST_STATUS_LABEL = {
  not_generated: 'Not Generated', generated: 'Generated', failed: 'Failed', cancelled: 'Cancelled',
};

/**
 * E-Invoice (IRN) / E-Way Bill panel (section 10) — every action here calls
 * the real backend endpoints in App\Services\GstEInvoiceService. When no
 * GSP (GST Suvidha Provider) account is configured (GST_API_ENABLED=false
 * in backend/.env, the shipped default), Generate always comes back with
 * a real "not configured" error naming the exact env vars to set — never a
 * fake IRN/EWB number. This panel just displays whatever the backend
 * actually returns.
 */
function GstFilingPanel({ invoice, canManage }) {
  const queryClient = useQueryClient();
  const [transportOpen, setTransportOpen] = useState(false);
  const [transporterName, setTransporterName] = useState(invoice.transporter_name || '');
  const [transporterGstin, setTransporterGstin] = useState(invoice.transporter_gstin || '');
  const [distance, setDistance] = useState(invoice.transport_distance_km || '');
  const [vehicleNo, setVehicleNo] = useState(invoice.vehicle_no || '');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id] });

  const runAction = async (key, fn) => {
    setActionError('');
    setBusy(key);
    try {
      await fn();
      invalidate();
    } catch (err) {
      setActionError(err?.response?.data?.result?.error || err?.response?.data?.error || err?.message || 'Request failed.');
    } finally {
      setBusy('');
    }
  };

  const saveTransport = () => runAction('transport', async () => {
    await invoicesApi.updateTransport(invoice.id, {
      transporter_name: transporterName || null,
      transporter_gstin: transporterGstin || null,
      transport_distance_km: distance ? Number(distance) : null,
      vehicle_no: vehicleNo || null,
    });
    setTransportOpen(false);
  });

  return (
    <div className="mb-3 rounded-lg border border-border-soft p-3">
      <div className="mb-2 text-xs font-semibold uppercase text-ink-muted">GST Filing</div>

      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm text-ink">
          E-Invoice (IRN) <Badge variant={GST_STATUS_VARIANT[invoice.einvoice_status]}>{GST_STATUS_LABEL[invoice.einvoice_status]}</Badge>
        </div>
        {canManage && (
          invoice.einvoice_status === 'generated' ? (
            <Button size="sm" variant="danger" disabled={busy === 'einvoice_cancel'} onClick={() => runAction('einvoice_cancel', () => invoicesApi.cancelEInvoice(invoice.id, 'Cancelled from Invoice Management'))}>
              {busy === 'einvoice_cancel' ? 'Cancelling…' : 'Cancel E-Invoice'}
            </Button>
          ) : (
            <Button size="sm" disabled={busy === 'einvoice'} onClick={() => runAction('einvoice', () => invoicesApi.generateEInvoice(invoice.id))}>
              {busy === 'einvoice' ? 'Generating…' : 'Generate E-Invoice'}
            </Button>
          )
        )}
      </div>
      {invoice.irn && <div className="mb-1 text-xs text-ink-muted">IRN: {invoice.irn} · Ack# {invoice.ack_no} · {invoice.ack_date}</div>}
      {invoice.einvoice_status === 'failed' && invoice.einvoice_error && (
        <div className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-danger">{invoice.einvoice_error}</div>
      )}

      <div className="mb-2 mt-3 flex items-center justify-between">
        <div className="text-sm text-ink">
          E-Way Bill <Badge variant={GST_STATUS_VARIANT[invoice.eway_bill_status]}>{GST_STATUS_LABEL[invoice.eway_bill_status]}</Badge>
        </div>
        {canManage && (
          <div className="flex gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => setTransportOpen((v) => !v)}>Transport Details</Button>
            {invoice.eway_bill_status === 'generated' ? (
              <Button size="sm" variant="danger" disabled={busy === 'eway_cancel'} onClick={() => runAction('eway_cancel', () => invoicesApi.cancelEWayBill(invoice.id, 'Cancelled from Invoice Management'))}>
                {busy === 'eway_cancel' ? 'Cancelling…' : 'Cancel'}
              </Button>
            ) : (
              <Button size="sm" disabled={busy === 'eway'} onClick={() => runAction('eway', () => invoicesApi.generateEWayBill(invoice.id))}>
                {busy === 'eway' ? 'Generating…' : 'Generate E-Way Bill'}
              </Button>
            )}
          </div>
        )}
      </div>
      {invoice.eway_bill_no && (
        <div className="mb-1 text-xs text-ink-muted">
          EWB# {invoice.eway_bill_no} · Valid until {invoice.eway_bill_valid_until || '-'}
        </div>
      )}
      {invoice.eway_bill_status === 'failed' && invoice.eway_bill_error && (
        <div className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-danger">{invoice.eway_bill_error}</div>
      )}

      {transportOpen && (
        <div className="mt-2 grid grid-cols-2 gap-2 rounded bg-page p-2">
          <input className="input" placeholder="Transporter name" value={transporterName} onChange={(e) => setTransporterName(e.target.value)} />
          <input className="input" placeholder="Transporter GSTIN" value={transporterGstin} onChange={(e) => setTransporterGstin(e.target.value)} />
          <input className="input" type="number" placeholder="Distance (km)" value={distance} onChange={(e) => setDistance(e.target.value)} />
          <input className="input" placeholder="Vehicle No" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} />
          <div className="col-span-2 flex justify-end">
            <Button size="sm" disabled={busy === 'transport'} onClick={saveTransport}>{busy === 'transport' ? 'Saving…' : 'Save Transport Details'}</Button>
          </div>
        </div>
      )}

      {actionError && <div className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-danger">{actionError}</div>}
    </div>
  );
}

function ViewModal({ id, onClose }) {
  const canManageGst = usePermission('pos.manage_gst_filing');
  const { data } = useQuery({ queryKey: ['invoice', id], queryFn: () => invoicesApi.get(id) });
  if (!data) return null;
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[85vh] w-[640px] overflow-auto card p-5">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-lg font-semibold text-ink">{data.invoice_no || data.original_invoice_no || `Held #${data.id}`}</span>
          <Badge variant={STATUS_VARIANT[data.payment_status] || 'neutral'}>{data.payment_status || data.status}</Badge>
        </div>
        <div className="mb-3 text-xs text-ink-muted">
          {data.customer_name || 'Walk-in'} · {data.invoice_date} · Billed by {data.employee_name}
          {data.edited_at && <span> · Last edited {data.edited_at}</span>}
        </div>
        {(() => {
          let percentDiscountTotal = 0;
          let rupeeDiscountTotal = 0;
          (data.items || []).forEach((it) => {
            const gross = Number(it.qty || 0) * Number(it.rate || 0);
            const pct = Number(it.discount_percent || 0);
            const pctDisc = gross > 0 && pct > 0 ? Math.round(((gross * pct) / 100) * 100) / 100 : 0;
            const directAmt = Math.max(0, Math.round((Number(it.discount_amount || 0) - pctDisc) * 100) / 100);
            percentDiscountTotal += pctDisc;
            rupeeDiscountTotal += directAmt;
          });
          return (
            <>
              <table className="mb-3 w-full text-xs">
                <thead>
                  <tr className="border-b border-border-soft text-left text-ink-muted">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">Disc (₹)</th>
                    <th className="py-1 text-right">Disc (%)</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((line) => {
                    const gross = Number(line.qty || 0) * Number(line.rate || 0);
                    const pct = Number(line.discount_percent || 0);
                    const pctDisc = gross > 0 && pct > 0 ? Math.round(((gross * pct) / 100) * 100) / 100 : 0;
                    const directAmt = Math.max(0, Math.round((Number(line.discount_amount || 0) - pctDisc) * 100) / 100);
                    return (
                      <tr key={line.id} className="border-b border-border-soft">
                        <td className="py-1 font-medium">{line.item_name_snapshot}</td>
                        <td className="py-1 text-center">{line.qty} {line.unit_code}</td>
                        <td className="py-1 text-right">₹{Number(line.rate).toFixed(2)}</td>
                        <td className="py-1 text-right">{directAmt > 0 ? `₹${directAmt.toFixed(2)}` : '-'}</td>
                        <td className="py-1 text-right">{pct > 0 ? `${pct.toFixed(2)}%` : '-'}</td>
                        <td className="py-1 text-right font-semibold">₹{Number(line.net_amount ?? line.line_total).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mb-3 space-y-1 text-xs border-t border-border-soft pt-2">
                <div className="flex justify-between text-ink-muted">
                  <span>Subtotal:</span>
                  <span>₹{Number(data.subtotal || 0).toFixed(2)}</span>
                </div>
                {percentDiscountTotal > 0 && (
                  <div className="flex justify-between text-ink-muted">
                    <span>Discount (%):</span>
                    <span className="text-danger font-medium">- ₹{percentDiscountTotal.toFixed(2)}</span>
                  </div>
                )}
                {rupeeDiscountTotal > 0 && (
                  <div className="flex justify-between text-ink-muted">
                    <span>Discount (₹):</span>
                    <span className="text-danger font-medium">- ₹{rupeeDiscountTotal.toFixed(2)}</span>
                  </div>
                )}
                {percentDiscountTotal <= 0 && rupeeDiscountTotal <= 0 && Number(data.discount_amount || 0) > 0 && (
                  <div className="flex justify-between text-ink-muted">
                    <span>Discount:</span>
                    <span className="text-danger font-medium">- ₹{Number(data.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-ink pt-1 border-t border-border-soft">
                  <span>Grand Total:</span>
                  <span>₹{Number(data.grand_total).toFixed(2)}</span>
                </div>
              </div>
            </>
          );
        })()}
        {data.bill_type === 'gst' && data.status === 'completed' && (
          <GstFilingPanel invoice={data} canManage={canManageGst} />
        )}
        {data.status === 'cancelled' && (
          <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-danger">
            Cancelled by {data.cancelled_by_name || 'user'} on {data.cancelled_at}{data.cancel_reason ? ` — ${data.cancel_reason}` : ''}
          </div>
        )}
        {data.status === 'deleted' && (
          <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-danger">
            Deleted by {data.deleted_by_name || 'user'} on {data.deleted_at}{data.delete_reason ? ` — ${data.delete_reason}` : ''}
            {data.original_invoice_no && <span> · was {data.original_invoice_no}, number freed for reuse</span>}
          </div>
        )}
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

function CancelModal({ invoice, onClose, onConfirm, error }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
      <div className="w-[420px] card p-5">
        <div className="mb-1 text-lg font-semibold text-ink">Cancel {invoice.invoice_no}</div>
        <p className="mb-3 text-xs text-ink-muted">
          This reverses the stock deducted by this sale and, if it was a credit sale, reduces the customer's
          outstanding by whatever is still unpaid. This cannot be undone — rebill the customer separately if needed.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for cancellation (optional)"
          className="input mb-3 h-20 resize-none"
        />
        {error && <p className="mb-2 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Back</Button>
          <Button variant="danger" onClick={() => onConfirm(reason)}>Confirm Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ invoice, onClose, onConfirm, error }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
      <div className="w-[420px] card p-5">
        <div className="mb-1 text-lg font-semibold text-ink">Delete {invoice.invoice_no}</div>
        <p className="mb-3 text-xs text-ink-muted">
          This reverses the stock deducted by this sale and, if it was a credit sale, reduces the customer's
          outstanding by whatever is still unpaid — same as Cancel. Unlike Cancel, the invoice is hidden from
          reports entirely and its number ({invoice.invoice_no}) becomes available for reuse by the next invoice.
          This cannot be undone.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for deletion (optional)"
          className="input mb-3 h-20 resize-none"
        />
        {error && <p className="mb-2 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Back</Button>
          <Button variant="danger" onClick={() => onConfirm(reason)}>Confirm Delete</Button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ id, onClose }) {
  const queryClient = useQueryClient();
  const canDiscount = usePermission('pos.apply_discount');
  const canEditPrice = usePermission('pos.edit_price_at_sale');

  const invoiceQuery = useQuery({ queryKey: ['invoice', id], queryFn: () => invoicesApi.get(id) });
  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list('') });
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: customersApi.list });

  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState(null); // null until invoice loads
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (invoiceQuery.data && lines === null) {
      const inv = invoiceQuery.data;
      setCustomerId(inv.customer_id ?? '');
      setLines(
        inv.items.map((it) => {
          const lineGross = Number(it.qty) * Number(it.rate);
          const pctVal = Number(it.discount_percent || 0);
          const pctDisc = lineGross > 0 && pctVal > 0 ? Math.round(((lineGross * pctVal) / 100) * 100) / 100 : 0;
          const directAmt = Math.max(0, Math.round((Number(it.discount_amount || 0) - pctDisc) * 100) / 100);

          return {
            key: `${it.id}-${Math.random()}`,
            item: {
              id: it.item_id,
              item_name: it.item_name_snapshot,
              retail_price: it.rate,
              gst_percent: it.tax_percent,
              cess_percent: 0,
              base_unit_id: it.unit_id,
            },
            qty: Number(it.qty),
            free_qty: Number(it.free_qty),
            discount_percent: pctVal > 0 ? pctVal : '',
            discount_amount: directAmt > 0 ? directAmt : '',
            unit_id: it.unit_id,
            rate: Number(it.rate),
          };
        })
      );
    }
  }, [invoiceQuery.data, lines]);

  const items = itemsQuery.data || [];
  const customers = customersQuery.data || [];
  const invoice = invoiceQuery.data;

  const pricedLines = useMemo(
    () =>
      (lines || []).map((line) => ({
        ...line,
        priced: priceLine(line.item, line),
      })),
    [lines]
  );
  const totals = useMemo(() => computeCartTotals(pricedLines.map((l) => l.priced)), [pricedLines]);

  const updateLine = (key, patch) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key) => setLines((prev) => prev.filter((l) => l.key !== key));
  const addLine = (itemId) => {
    const item = items.find((i) => i.id === Number(itemId));
    if (!item) return;
    setLines((prev) => [
      ...prev,
      {
        key: `new-${item.id}-${Date.now()}`,
        item,
        qty: 1,
        free_qty: 0,
        discount_percent: '',
        discount_amount: '',
        discount_mode: 'amount',
        unit_id: item.base_unit_id,
        rate: item.retail_price,
      },
    ]);
  };

  const editMutation = useMutation({
    mutationFn: () =>
      invoicesApi.editCompleted(id, {
        customer_id: customerId ? Number(customerId) : null,
        items: (lines || []).map((l) => ({
          item_id: l.item.id,
          qty: Number(l.qty),
          free_qty: Number(l.free_qty || 0),
          unit_id: l.unit_id,
          ...(canDiscount
            ? {
                discount_amount: Number(l.discount_amount || 0),
                discount_percent: Number(l.discount_percent || 0),
                discount_mode: l.discount_mode || 'amount',
              }
            : {}),
          ...(canEditPrice ? { rate: Number(l.rate) } : {}),
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      setSuccess(true);
      setConfirming(false);
    },
    onError: (err) => {
      setError(err?.response?.data?.error || 'Failed to update invoice');
      setConfirming(false);
    },
  });

  if (!invoice || lines === null) {
    return (
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
        <div className="card p-6 text-sm text-ink-muted">Loading invoice…</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto card p-5">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-lg font-semibold text-ink">Edit {invoice.invoice_no}</div>
          <Badge variant="warning">Original total: Rs. {invoice.grand_total}</Badge>
        </div>
        <p className="mb-3 text-xs text-ink-muted">
          Stock for the old items is reversed and stock for the new items is applied automatically. Payments already
          collected (Rs. {invoice.paid_amount}) are never altered — only the remaining balance and the customer's
          credit are adjusted by the difference.
        </p>

        {success ? (
          <div className="rounded-lg bg-success-bg px-4 py-3 text-sm font-medium text-success">
            Invoice updated successfully.
          </div>
        ) : (
          <>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-ink-muted">Customer</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input w-64">
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.ledger_name}</option>
                ))}
              </select>
            </div>

            <div className="mb-3 flex flex-col gap-2">
              {pricedLines.map((line) => (
                <div key={line.key} className="rounded-lg border border-border-soft p-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">{line.item.item_name}</span>
                    <button onClick={() => removeLine(line.key)} className="text-ink-muted hover:text-danger">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <label className="flex items-center gap-1">
                      Qty
                      <input
                        type="number" min="0" step="any" value={line.qty}
                        onChange={(e) => updateLine(line.key, { qty: e.target.value })}
                        className="w-16 rounded border border-border-soft px-1 py-0.5 text-center"
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      Rate
                      <input
                        type="number" step="any" disabled={!canEditPrice} value={line.rate}
                        onChange={(e) => updateLine(line.key, { rate: e.target.value })}
                        className="w-20 rounded border border-border-soft px-1 py-0.5 text-right disabled:bg-page"
                      />
                    </label>
                    {canDiscount && (
                      <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                        <span className="font-medium text-ink">Disc:</span>
                        <div className="flex items-center rounded border border-border-soft bg-white px-1.5 py-0.5 focus-within:border-gold">
                          <span className="text-[11px] text-ink-muted mr-1 font-semibold">₹</span>
                          <input
                            type="number"
                            min="0"
                            max={line.priced?.gross}
                            step="any"
                            placeholder="0.00"
                            value={line.discount_amount ?? ''}
                            onChange={(e) => updateLine(line.key, { discount_amount: e.target.value })}
                            onBlur={() => {
                              const num = Number(line.discount_amount);
                              if (num > (line.priced?.gross || 0)) {
                                updateLine(line.key, { discount_amount: String(line.priced.gross) });
                              } else if (num < 0) {
                                updateLine(line.key, { discount_amount: '0' });
                              }
                            }}
                            className="w-14 bg-transparent text-right text-xs text-ink outline-none"
                            title="Discount Amount in ₹"
                          />
                        </div>

                        <div className="flex items-center rounded border border-border-soft bg-white px-1.5 py-0.5 focus-within:border-gold">
                          <span className="text-[11px] text-ink-muted mr-1 font-semibold">%</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            placeholder="0"
                            value={line.discount_percent ?? ''}
                            onChange={(e) => updateLine(line.key, { discount_percent: e.target.value })}
                            onBlur={() => {
                              const num = Number(line.discount_percent);
                              if (num > 100) {
                                updateLine(line.key, { discount_percent: '100' });
                              } else if (num < 0) {
                                updateLine(line.key, { discount_percent: '0' });
                              }
                            }}
                            className="w-11 bg-transparent text-right text-xs text-ink outline-none"
                            title="Discount Percentage"
                          />
                        </div>
                      </div>
                    )}
                    <span className="ml-auto font-semibold text-ink">Rs. {line.priced.line_total.toFixed(2)}</span>
                  </div>
                </div>
              ))}
              {lines.length === 0 && <p className="py-4 text-center text-sm text-ink-muted">No items — add at least one below.</p>}
            </div>

            <div className="mb-3 flex items-center gap-2">
              <select onChange={(e) => { if (e.target.value) { addLine(e.target.value); e.target.value = ''; } }} className="input flex-1" defaultValue="">
                <option value="" disabled>+ Add an item…</option>
                {items.map((i) => <option key={i.id} value={i.id}>{i.item_name}</option>)}
              </select>
            </div>

            <div className="mb-3 rounded-lg bg-page p-3 text-sm">
              <div className="flex justify-between text-ink-muted"><span>Subtotal</span><span>{totals.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-ink-muted"><span>GST</span><span>{(totals.cgst + totals.sgst + totals.cessAmount).toFixed(2)}</span></div>
              <div className="flex justify-between text-ink-muted"><span>Discount</span><span>{totals.discountAmount.toFixed(2)}</span></div>
              <div className="mt-1 flex justify-between border-t border-border-soft pt-1 font-bold text-ink"><span>New Total</span><span>Rs. {totals.grandTotal.toFixed(2)}</span></div>
            </div>

            {error && <p className="mb-2 text-sm text-danger">{error}</p>}

            {confirming ? (
              <div className="rounded-lg bg-warning-bg px-3 py-3 text-sm text-warning">
                <p className="mb-2 font-medium">Are you sure you want to update this invoice?</p>
                <p className="mb-3 text-xs">
                  Total changes from Rs. {invoice.grand_total} to Rs. {totals.grandTotal.toFixed(2)}. Stock and the customer's
                  credit balance will be adjusted accordingly.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setConfirming(false)} disabled={editMutation.isPending}>Back</Button>
                  <Button size="sm" onClick={() => editMutation.mutate()} disabled={editMutation.isPending}>Yes, Update Invoice</Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button onClick={() => { setError(''); setConfirming(true); }} disabled={lines.length === 0}>Save Changes</Button>
              </div>
            )}
          </>
        )}

        {success && (
          <div className="mt-4 flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function InvoiceManagement() {
  const canCancel = usePermission('pos.cancel_completed_invoice');
  const canDelete = usePermission('pos.delete_completed_invoice');
  const canEdit = usePermission('pos.edit_completed_invoice');
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState(null);
  const [printingId, setPrintingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [cancelError, setCancelError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const invoicesQuery = useQuery({
    queryKey: ['invoices', statusFilter, search, page],
    queryFn: () => invoicesApi.list({ page, limit: 10, search, status: statusFilter || undefined }),
  });
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => invoicesApi.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setCancelling(null);
      setCancelError('');
    },
    onError: (err) => setCancelError(err?.response?.data?.error || 'Failed to cancel'),
  });
  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }) => invoicesApi.deleteCompleted(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setDeleting(null);
      setDeleteError('');
    },
    onError: (err) => setDeleteError(err?.response?.data?.error || 'Failed to delete'),
  });

  const responseData = invoicesQuery.data;
  const invoices = Array.isArray(responseData) ? responseData : (responseData?.data || []);
  const total = typeof responseData?.total === 'number' ? responseData.total : invoices.length;
  const totalPages = typeof responseData?.total_pages === 'number' ? responseData.total_pages : Math.max(1, Math.ceil(total / 10));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  return (
    <div className="space-y-2.5">
      <div className="border-b border-border-soft pb-2">
        <h1 className="text-xl font-bold text-ink">Invoice Management</h1>
        <p className="text-xs text-ink-muted">Search, view, print, edit and cancel invoices.</p>
      </div>

      <Card
        title="Invoices"
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search invoice # or customer"
                className="input w-48 sm:w-56 pl-8 text-xs py-1"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input w-36 text-xs py-1"
            >
              <option value="">All statuses</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="returned">Returned</option>
              <option value="deleted">Deleted</option>
            </select>
          </div>
        }
      >
        <div className="max-h-[calc(100vh-210px)] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-page z-10 shadow-sm">
              <tr className="border-b border-border-soft text-left uppercase text-ink-muted font-medium bg-surface-subtle/30">
                <th className="px-3 py-2">Invoice #</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Payment</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft/60">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-surface-subtle/20 transition">
                  <td className="px-3 py-1.5 font-medium text-ink">{inv.invoice_no || inv.original_invoice_no || `Held #${inv.id}`}</td>
                  <td className="px-3 py-1.5">{inv.customer_name || 'Walk-in'}</td>
                  <td className="px-3 py-1.5 text-ink-muted">{inv.invoice_date}</td>
                  <td className="px-3 py-1.5 font-semibold">₹{inv.grand_total}</td>
                  <td className="px-3 py-1.5"><Badge variant={STATUS_VARIANT[inv.payment_status] || 'neutral'}>{inv.payment_status || '-'}</Badge></td>
                  <td className="px-3 py-1.5 capitalize">{inv.status}{inv.edited_at ? ' (edited)' : ''}</td>
                  <td className="px-3 py-1.5">
                    <div className="flex justify-end gap-1.5">
                      <button title="View" onClick={() => setViewingId(inv.id)} className="p-1 text-ink-muted hover:text-ink">
                        <Eye size={15} />
                      </button>
                      <button title="Print" onClick={() => setPrintingId(inv.id)} className="p-1 text-ink-muted hover:text-ink">
                        <Printer size={15} />
                      </button>
                      {canEdit && inv.status === 'completed' && (
                        <button title="Edit" onClick={() => setEditingId(inv.id)} className="p-1 text-ink-muted hover:text-gold">
                          <Pencil size={15} />
                        </button>
                      )}
                      {canCancel && inv.status === 'completed' && (
                        <button title="Cancel" onClick={() => { setCancelling(inv); setCancelError(''); }} className="p-1 text-danger hover:text-red-700">
                          <Ban size={15} />
                        </button>
                      )}
                      {canDelete && inv.status === 'completed' && (
                        <button title="Delete" onClick={() => { setDeleting(inv); setDeleteError(''); }} className="p-1 text-danger hover:text-red-700">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-ink-muted">No invoices found.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={10} total={total} onPageChange={setPage} />
      </Card>


      {viewingId && <ViewModal id={viewingId} onClose={() => setViewingId(null)} />}
      {printingId && <PrintPreviewModal invoiceId={printingId} onClose={() => setPrintingId(null)} />}
      {editingId && <EditModal id={editingId} onClose={() => setEditingId(null)} />}
      {cancelling && (
        <CancelModal
          invoice={cancelling}
          error={cancelError}
          onClose={() => setCancelling(null)}
          onConfirm={(reason) => cancelMutation.mutate({ id: cancelling.id, reason })}
        />
      )}
      {deleting && (
        <DeleteModal
          invoice={deleting}
          error={deleteError}
          onClose={() => setDeleting(null)}
          onConfirm={(reason) => deleteMutation.mutate({ id: deleting.id, reason })}
        />
      )}
    </div>
  );
}
