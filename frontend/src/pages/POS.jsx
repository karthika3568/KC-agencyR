import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { itemsApi, stockUnitsApi } from '../api/catalog';
import { customersApi } from '../api/parties';
import { invoicesApi } from '../api/invoices';
import { usePermission } from '../hooks/usePermission';
import { priceLine, computeCartTotals } from '../utils/pricing';

const PAYMENT_METHODS = ['cash', 'upi', 'card', 'credit', 'other'];

function newLine(item) {
  return {
    key: `${item.id}-${Date.now()}-${Math.random()}`,
    item,
    qty: 1,
    free_qty: 0,
    discount_percent: 0,
    unit_id: item.base_unit_id,
    rate: item.retail_price,
  };
}

export function POS() {
  const queryClient = useQueryClient();
  const canGst = usePermission('pos.gst_billing');
  const canNonGst = usePermission('pos.non_gst_billing');
  const canDiscount = usePermission('pos.apply_discount');
  const canEditPrice = usePermission('pos.edit_price_at_sale');
  const canVoidHold = usePermission('pos.void_hold_bill');

  const [billType, setBillType] = useState(canGst ? 'gst' : 'non_gst');
  const [customerId, setCustomerId] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [heldId, setHeldId] = useState(null);
  const [showHeldList, setShowHeldList] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [payments, setPayments] = useState([{ payment_method: 'cash', amount: 0, reference_no: '' }]);
  const [message, setMessage] = useState('');
  const searchInputRef = useRef(null);

  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list('') });
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: customersApi.list });
  const unitsQuery = useQuery({ queryKey: ['stock-units'], queryFn: stockUnitsApi.list });
  const heldQuery = useQuery({ queryKey: ['invoices', 'held'], queryFn: () => invoicesApi.list('held') });

  const items = itemsQuery.data || [];
  const customers = customersQuery.data || [];
  const units = unitsQuery.data || [];
  const heldInvoices = heldQuery.data || [];

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return items
      .filter(
        (i) =>
          i.item_name.toLowerCase().includes(term) ||
          (i.item_code || '').toLowerCase().includes(term) ||
          (i.barcode || '').toLowerCase() === term
      )
      .slice(0, 8);
  }, [items, search]);

  const pricedLines = useMemo(() => cart.map((line) => ({ ...line, priced: priceLine(line.item, line) })), [cart]);
  const totals = useMemo(() => computeCartTotals(pricedLines.map((l) => l.priced)), [pricedLines]);

  useEffect(() => {
    if (!splitMode) {
      setPayments((prev) => [{ ...prev[0], amount: totals.grandTotal }]);
    }
  }, [totals.grandTotal, splitMode]);

  const addItem = (item) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.item.id === item.id && l.unit_id === item.base_unit_id);
      if (existing) {
        return prev.map((l) => (l.key === existing.key ? { ...l, qty: Number(l.qty) + 1 } : l));
      }
      return [...prev, newLine(item)];
    });
    setSearch('');
  };

  const handleSearchKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const term = search.trim().toLowerCase();
    if (!term) return;
    const exact = items.find((i) => (i.barcode || '').toLowerCase() === term || (i.item_code || '').toLowerCase() === term);
    if (exact) {
      addItem(exact);
      return;
    }
    if (filteredItems.length === 1) {
      addItem(filteredItems[0]);
    }
  };

  const updateLine = (key, patch) => setCart((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key) => setCart((prev) => prev.filter((l) => l.key !== key));

  const resetBill = () => {
    setCart([]);
    setCustomerId('');
    setVehicleNo('');
    setHeldId(null);
    setPayments([{ payment_method: 'cash', amount: 0, reference_no: '' }]);
    setSplitMode(false);
  };

  const buildPayload = () => ({
    bill_type: billType,
    customer_id: customerId ? Number(customerId) : null,
    vehicle_no: vehicleNo || null,
    items: cart.map((l) => ({
      item_id: l.item.id,
      qty: Number(l.qty),
      free_qty: Number(l.free_qty || 0),
      unit_id: l.unit_id,
      ...(canDiscount ? { discount_percent: Number(l.discount_percent || 0) } : {}),
      ...(canEditPrice ? { rate: Number(l.rate) } : {}),
    })),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      if (heldId) {
        return invoicesApi.update(heldId, payload);
      }
      const created = await invoicesApi.create(payload);
      setHeldId(created.id);
      return created;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices', 'held'] }),
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const saved = heldId ? await invoicesApi.update(heldId, buildPayload()) : await invoicesApi.create(buildPayload());
      const id = saved.id;
      return invoicesApi.complete(id, payments.filter((p) => Number(p.amount) > 0));
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', 'held'] });
      window.open(`/print/invoice/${result.id}?format=a4`, '_blank');
      resetBill();
      setMessage(`Invoice ${result.invoice_no} completed.`);
      setTimeout(() => setMessage(''), 4000);
    },
  });

  const resumeHeld = async (invoiceId) => {
    const invoice = await invoicesApi.get(invoiceId);
    setHeldId(invoice.id);
    setBillType(invoice.bill_type);
    setCustomerId(invoice.customer_id || '');
    setVehicleNo(invoice.vehicle_no || '');
    setCart(
      invoice.items.map((it) => ({
        key: `${it.item_id}-${it.id}`,
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
        discount_percent: Number(it.discount_percent),
        unit_id: it.unit_id,
        rate: Number(it.rate),
      }))
    );
    setShowHeldList(false);
  };

  const discardHeld = async (invoiceId) => {
    await invoicesApi.discard(invoiceId);
    queryClient.invalidateQueries({ queryKey: ['invoices', 'held'] });
    if (heldId === invoiceId) resetBill();
  };

  const paymentsTotal = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remaining = Math.round((totals.grandTotal - paymentsTotal) * 100) / 100;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-800">POS Billing</h1>
        <div className="flex items-center gap-2">
          {message && <span className="text-sm font-medium text-green-700">{message}</span>}
          <button
            onClick={() => setShowHeldList((v) => !v)}
            className="rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Resume Held Bills ({heldInvoices.length})
          </button>
        </div>
      </div>

      {showHeldList && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
          {heldInvoices.length === 0 && <p className="text-sm text-gray-400">No held bills.</p>}
          {heldInvoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between border-b border-gray-50 py-2 text-sm last:border-0">
              <span>
                #{inv.id} · {inv.bill_type.toUpperCase()} · {inv.customer_name || 'Walk-in'} · Rs. {inv.grand_total}
              </span>
              <div className="flex gap-2">
                <button onClick={() => resumeHeld(inv.id)} className="font-medium text-blue-600 hover:underline">
                  Resume
                </button>
                {canVoidHold && (
                  <button onClick={() => discardHeld(inv.id)} className="font-medium text-red-600 hover:underline">
                    Discard
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex overflow-hidden rounded border border-gray-300">
              <button
                disabled={!canGst}
                onClick={() => setBillType('gst')}
                className={`px-3 py-1.5 text-sm font-semibold ${billType === 'gst' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'} disabled:opacity-40`}
              >
                GST Billing
              </button>
              <button
                disabled={!canNonGst}
                onClick={() => setBillType('non_gst')}
                className={`px-3 py-1.5 text-sm font-semibold ${billType === 'non_gst' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'} disabled:opacity-40`}
              >
                Non-GST / Estimate
              </button>
            </div>

            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input w-48">
              <option value="">Walk-in Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.ledger_name}</option>
              ))}
            </select>

            <input
              placeholder="Vehicle no (optional)"
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              className="input w-40"
            />
          </div>

          <div className="relative mb-4 rounded-lg border border-gray-200 bg-white p-3">
            <input
              ref={searchInputRef}
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Scan barcode or search item, then Enter"
              className="input"
            />
            {filteredItems.length > 0 && (
              <div className="absolute left-3 right-3 top-full z-10 mt-1 max-h-64 overflow-auto rounded border border-gray-200 bg-white shadow-lg">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addItem(item)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <span>{item.item_name} <span className="text-gray-400">({item.item_code})</span></span>
                    <span className="text-gray-500">Rs. {item.retail_price}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Free</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2">Rate</th>
                  {canDiscount && <th className="px-3 py-2">Disc %</th>}
                  <th className="px-3 py-2">GST%</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {pricedLines.map((line) => (
                  <tr key={line.key} className="border-b border-gray-50">
                    <td className="px-3 py-1.5">{line.item.item_name}</td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={line.qty}
                        onChange={(e) => updateLine(line.key, { qty: e.target.value })}
                        className="w-16 rounded border border-gray-300 px-1 py-0.5"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={line.free_qty}
                        onChange={(e) => updateLine(line.key, { free_qty: e.target.value })}
                        className="w-14 rounded border border-gray-300 px-1 py-0.5"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-gray-500">
                      {units.find((u) => u.id === line.unit_id)?.short_code || ''}
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        step="any"
                        disabled={!canEditPrice}
                        value={line.rate}
                        onChange={(e) => updateLine(line.key, { rate: e.target.value })}
                        className="w-20 rounded border border-gray-300 px-1 py-0.5 disabled:bg-gray-50"
                      />
                    </td>
                    {canDiscount && (
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          step="any"
                          value={line.discount_percent}
                          onChange={(e) => updateLine(line.key, { discount_percent: e.target.value })}
                          className="w-16 rounded border border-gray-300 px-1 py-0.5"
                        />
                      </td>
                    )}
                    <td className="px-3 py-1.5 text-gray-500">{line.priced.tax_percent}</td>
                    <td className="px-3 py-1.5 text-right font-medium">{line.priced.line_total.toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-right">
                      <button onClick={() => removeLine(line.key)} className="text-xs text-red-600 hover:underline">
                        &times;
                      </button>
                    </td>
                  </tr>
                ))}
                {cart.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-gray-400">Cart is empty — scan or search an item above.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-2 font-semibold text-gray-800">Bill Summary</div>
            <SummaryRow label="Subtotal" value={totals.subtotal} />
            <SummaryRow label="Discount" value={totals.discountAmount} />
            <SummaryRow label="Taxable value" value={totals.taxableValue} />
            <SummaryRow label="CGST" value={totals.cgst} />
            <SummaryRow label="SGST" value={totals.sgst} />
            {totals.cessAmount > 0 && <SummaryRow label="Cess" value={totals.cessAmount} />}
            <SummaryRow label="Round off" value={totals.roundOff} />
            <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 text-lg font-bold text-gray-900">
              <span>Grand Total</span>
              <span>Rs. {totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-gray-800">Payment</span>
              <label className="flex items-center gap-1 text-xs text-gray-500">
                <input type="checkbox" checked={splitMode} onChange={(e) => setSplitMode(e.target.checked)} />
                Split Payment
              </label>
            </div>

            {!splitMode ? (
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setPayments([{ payment_method: m, amount: totals.grandTotal, reference_no: '' }])}
                    className={`rounded px-2 py-1 text-xs font-medium capitalize ${
                      payments[0]?.payment_method === m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {payments.map((p, idx) => (
                  <div key={idx} className="flex gap-1">
                    <select
                      value={p.payment_method}
                      onChange={(e) =>
                        setPayments((prev) => prev.map((row, i) => (i === idx ? { ...row, payment_method: e.target.value } : row)))
                      }
                      className="input w-24"
                    >
                      {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <input
                      type="number"
                      step="any"
                      value={p.amount}
                      onChange={(e) =>
                        setPayments((prev) => prev.map((row, i) => (i === idx ? { ...row, amount: e.target.value } : row)))
                      }
                      className="input w-24"
                    />
                    <button
                      onClick={() => setPayments((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-xs text-red-600"
                    >
                      &times;
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setPayments((prev) => [...prev, { payment_method: 'cash', amount: 0, reference_no: '' }])}
                  className="self-start text-xs font-medium text-blue-600 hover:underline"
                >
                  + Add payment line
                </button>
              </div>
            )}

            <div className={`mt-2 text-xs ${remaining > 0.009 ? 'text-amber-600' : 'text-gray-400'}`}>
              {remaining > 0.009 ? `Rs. ${remaining.toFixed(2)} will go on customer credit` : 'Fully covered'}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={cart.length === 0 || saveMutation.isPending}
              className="rounded bg-gray-800 py-2 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-40"
            >
              Hold Bill
            </button>
            <button
              onClick={() => completeMutation.mutate()}
              disabled={cart.length === 0 || completeMutation.isPending}
              className="rounded bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
            >
              Complete &amp; Print
            </button>
            {completeMutation.isError && (
              <p className="text-sm text-red-600">{completeMutation.error?.response?.data?.error || 'Failed to complete'}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm text-gray-600">
      <span>{label}</span>
      <span>{Number(value).toFixed(2)}</span>
    </div>
  );
}
