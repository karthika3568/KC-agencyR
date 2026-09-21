import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, ScanBarcode, Plus, UserPlus, Grid2x2, List, Minus, Trash2, Clock, Barcode, Image as ImageIcon, Camera, PackageX } from 'lucide-react';
import { itemsApi, stockUnitsApi, categoriesApi } from '../api/catalog';
import { customersApi } from '../api/parties';
import { invoicesApi } from '../api/invoices';
import { stockHubApi } from '../api/purchasing';
import { usePermission } from '../hooks/usePermission';
import { priceLine, computeCartTotals } from '../utils/pricing';
import { resolveImageUrl } from '../utils/media';
import { Badge } from '../components/Badge.jsx';
import { Card } from '../components/Card.jsx';
import { Button } from '../components/Button.jsx';
import { PrintPreviewModal } from '../components/PrintPreviewModal.jsx';
import { ImageSearchModal } from '../components/ImageSearchModal.jsx';

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash' },
  { key: 'upi', label: 'UPI' },
  { key: 'card', label: 'Card' },
  { key: 'credit', label: 'Credit' },
  { key: 'other', label: 'Other' },
];

function ProductThumb({ item, size = 'h-20', className = '' }) {
  const url = item.image ? resolveImageUrl(item.image) : null;
  const [broken, setBroken] = useState(false);
  return (
    <div className={`flex ${size} items-center justify-center overflow-hidden rounded-lg bg-page ${className}`}>
      {url && !broken ? (
        <img src={url} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <ImageIcon size={22} className="text-ink-muted/50" />
      )}
    </div>
  );
}

function newLine(item) {
  return {
    key: `${item.id}-${Date.now()}-${Math.random()}`,
    item,
    qty: 1,
    free_qty: 0,
    discount_percent: 0,
    discount_amount: '',
    discount_mode: 'percent',
    unit_id: item.base_unit_id,
    rate: item.retail_price,
  };
}

function taxBadge(item) {
  const pct = Number(item.gst_percent || 0);
  return pct > 0 ? <Badge variant="gst">GST {pct}%</Badge> : <Badge variant="non-gst">Non-GST</Badge>;
}

export function POS() {
  const queryClient = useQueryClient();
  const canGst = usePermission('pos.gst_billing');
  const canNonGst = usePermission('pos.non_gst_billing');
  const canDiscount = usePermission('pos.apply_discount');
  const canEditPrice = usePermission('pos.edit_price_at_sale');
  const canVoidHold = usePermission('pos.void_hold_bill');
  const canViewStock = usePermission('inventory.view_stock');

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
  const [printingInvoiceId, setPrintingInvoiceId] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [showImageSearch, setShowImageSearch] = useState(false);
  const searchInputRef = useRef(null);

  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list('') });
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: customersApi.list });
  const unitsQuery = useQuery({ queryKey: ['stock-units'], queryFn: stockUnitsApi.list });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const heldQuery = useQuery({ queryKey: ['invoices', 'held'], queryFn: () => invoicesApi.list('held') });
  const stockQuery = useQuery({ queryKey: ['stock-hub', 'branch'], queryFn: () => stockHubApi.list({ owner_type: 'branch' }), enabled: canViewStock });

  const items = itemsQuery.data || [];
  const customers = customersQuery.data || [];
  const units = unitsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const heldInvoices = heldQuery.data || [];
  const stockByItemId = useMemo(() => {
    const map = {};
    for (const row of stockQuery.data || []) map[row.item_id] = row.quantity_on_hand;
    return map;
  }, [stockQuery.data]);

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

  const gridItems = useMemo(() => {
    if (activeCategory === 'all') return items;
    return items.filter((i) => i.category_id === activeCategory);
  }, [items, activeCategory]);

  const pricedLines = useMemo(
    () =>
      cart.map((line) => ({
        ...line,
        priced: priceLine(line.item, line.discount_mode === 'amount' ? { ...line, discount_percent: 0 } : { ...line, discount_amount: '' }),
      })),
    [cart]
  );
  const totals = useMemo(() => computeCartTotals(pricedLines.map((l) => l.priced)), [pricedLines]);
  const uniformTaxPercent = pricedLines.length > 0 && pricedLines.every((l) => l.priced.tax_percent === pricedLines[0].priced.tax_percent)
    ? pricedLines[0].priced.tax_percent
    : null;

  useEffect(() => {
    if (!splitMode) {
      setPayments((prev) => [{ ...prev[0], amount: totals.grandTotal }]);
    }
  }, [totals.grandTotal, splitMode]);

  // Section: keyboard shortcuts — Ctrl+S opens Payment instead of the
  // browser's Save dialog, so a cashier never has to touch the mouse.
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (cart.length > 0) setShowPaymentModal(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart.length]);

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
  const bumpQty = (line, delta) => {
    const next = Number(line.qty) + delta;
    if (next < 1) return;
    updateLine(line.key, { qty: next });
  };

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
      ...(canDiscount
        ? l.discount_mode === 'amount'
          ? { discount_amount: Number(l.discount_amount || 0) }
          : { discount_percent: Number(l.discount_percent || 0) }
        : {}),
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
      setShowPaymentModal(false);
      setPrintingInvoiceId(result.id);
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
  const now = new Date();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex overflow-hidden rounded-lg border border-border-soft bg-white">
          <button
            disabled={!canGst}
            onClick={() => setBillType('gst')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${billType === 'gst' ? 'bg-navbar text-gold' : 'text-ink-muted'} disabled:opacity-40`}
          >
            GST Billing
          </button>
          <button
            disabled={!canNonGst}
            onClick={() => setBillType('non_gst')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${billType === 'non_gst' ? 'bg-navbar text-gold' : 'text-ink-muted'} disabled:opacity-40`}
          >
            Non-GST / Estimate
          </button>
        </div>
        <div className="flex items-center gap-2">
          {message && <span className="text-sm font-medium text-success">{message}</span>}
          <Button variant="secondary" onClick={() => setShowHeldList((v) => !v)}>
            Hold Bills ({heldInvoices.length})
          </Button>
        </div>
      </div>

      {showHeldList && (
        <Card className="mb-4 p-3">
          {heldInvoices.length === 0 && <p className="text-sm text-ink-muted">No held bills.</p>}
          {heldInvoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between border-b border-border-soft py-2 text-sm last:border-0">
              <span>
                #{inv.id} · {inv.bill_type.toUpperCase()} · {inv.customer_name || 'Walk-in'} · Rs. {inv.grand_total}
              </span>
              <div className="flex gap-3">
                <button onClick={() => resumeHeld(inv.id)} className="font-medium text-gold hover:underline">
                  Resume
                </button>
                {canVoidHold && (
                  <button onClick={() => discardHeld(inv.id)} className="font-medium text-danger hover:underline">
                    Discard
                  </button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        {/* Left panel — product browsing */}
        <div>
          <Card className="mb-4 p-3">
            <div className="flex flex-wrap items-center gap-3">
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input w-52">
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.ledger_name}</option>
                ))}
              </select>
              <Link to="/parties">
                <Button variant="primary" size="sm" icon={<UserPlus size={14} />}>
                  Add Customer
                </Button>
              </Link>

              <div className="relative min-w-[240px] flex-1">
                <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  ref={searchInputRef}
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search product by name, code or barcode…"
                  className="input pl-8"
                />
                {filteredItems.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-auto rounded-lg border border-border-soft bg-white shadow-lg">
                    {filteredItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => addItem(item)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-page"
                      >
                        <span>{item.item_name} <span className="text-ink-muted">({item.item_code})</span></span>
                        <span className="text-ink-muted">Rs. {item.retail_price}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => searchInputRef.current?.focus()}
                title="Focus search to scan a barcode"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold text-white hover:bg-gold-soft"
              >
                <ScanBarcode size={16} />
              </button>
              <button
                onClick={() => setShowImageSearch(true)}
                title="Find an item from a photo"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-soft bg-white text-ink-muted hover:bg-page"
              >
                <Camera size={16} />
              </button>
              <input
                placeholder="Vehicle no (optional)"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                className="input w-36"
              />
            </div>
          </Card>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${activeCategory === 'all' ? 'bg-gold text-white' : 'border border-border-soft bg-white text-ink-muted hover:bg-page'}`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${activeCategory === c.id ? 'bg-gold text-white' : 'border border-border-soft bg-white text-ink-muted hover:bg-page'}`}
              >
                {c.name}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-3">
              <span className="text-sm text-ink-muted">{gridItems.length} products</span>
              <div className="flex overflow-hidden rounded-lg border border-border-soft bg-white">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1 px-3 py-1.5 text-sm ${viewMode === 'grid' ? 'bg-page font-semibold text-ink' : 'text-ink-muted'}`}
                >
                  <Grid2x2 size={14} /> Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1 px-3 py-1.5 text-sm ${viewMode === 'list' ? 'bg-page font-semibold text-ink' : 'text-ink-muted'}`}
                >
                  <List size={14} /> List
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {gridItems.map((item) => {
                const stock = stockByItemId[item.id] ?? 0;
                const outOfStock = canViewStock && stock <= 0;
                const lowStock = canViewStock && stock > 0 && stock <= Number(item.min_stock_threshold || 0);
                return (
                  <button
                    key={item.id}
                    onClick={() => addItem(item)}
                    className="card group relative flex flex-col p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm"
                  >
                    <ProductThumb item={item} size="h-20" className="mb-2" />
                    {outOfStock && (
                      <span className="absolute right-2 top-2 rounded-full bg-danger px-2 py-0.5 text-[10px] font-semibold text-white">Out of stock</span>
                    )}
                    {!outOfStock && lowStock && (
                      <span className="absolute right-2 top-2 rounded-full bg-warning px-2 py-0.5 text-[10px] font-semibold text-white">Low stock</span>
                    )}
                    <div className="truncate text-sm font-semibold text-ink">{item.item_name}</div>
                    <div className="mb-1 font-bold text-ink">Rs. {item.retail_price}</div>
                    <div className="mb-1">{taxBadge(item)}</div>
                    <div className="flex items-center justify-between text-xs text-ink-muted">
                      <span>{canViewStock ? `Stock: ${stock}` : item.item_code}</span>
                      {item.barcode && <Barcode size={14} />}
                    </div>
                    <div className="pointer-events-none absolute inset-0 rounded-xl border-2 border-gold opacity-0 transition-opacity group-active:opacity-100" />
                  </button>
                );
              })}
              {gridItems.length === 0 && (
                <div className="col-span-full py-10 text-center text-ink-muted">No products in this category.</div>
              )}
            </div>
          ) : (
            <Card>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-left text-xs uppercase text-ink-muted">
                    <th className="px-4 py-2"></th>
                    <th className="px-4 py-2">Item</th>
                    <th className="px-4 py-2">Price</th>
                    <th className="px-4 py-2">Tax</th>
                    <th className="px-4 py-2">{canViewStock ? 'Stock' : 'Code'}</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {gridItems.map((item) => (
                    <tr key={item.id} className="border-b border-border-soft last:border-0">
                      <td className="px-4 py-2"><ProductThumb item={item} size="h-9 w-9" /></td>
                      <td className="px-4 py-2 font-medium text-ink">{item.item_name}</td>
                      <td className="px-4 py-2">Rs. {item.retail_price}</td>
                      <td className="px-4 py-2">{taxBadge(item)}</td>
                      <td className="px-4 py-2 text-ink-muted">{canViewStock ? stockByItemId[item.id] ?? 0 : item.item_code}</td>
                      <td className="px-4 py-2 text-right">
                        <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => addItem(item)}>
                          Add
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {gridItems.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-muted">No products in this category.</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        {/* Right panel — Current Bill */}
        <div>
          <Card className="flex flex-col p-4">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <div className="text-lg font-bold text-ink">Current Bill</div>
                <div className="text-xs text-ink-muted">{pricedLines.length} item(s)</div>
              </div>
              <div className="flex items-center gap-1 text-xs text-ink-muted">
                <Clock size={13} />
                {now.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            <div className="mb-3 flex max-h-80 flex-col gap-2 overflow-y-auto">
              {pricedLines.map((line) => (
                <div key={line.key} className="flex gap-2 rounded-lg border border-border-soft p-2">
                  <ProductThumb item={line.item} size="h-12 w-12" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink">{line.item.item_name}</div>
                        <div className="mt-0.5 flex items-center gap-1">
                          {taxBadge(line.item)}
                          {Number(line.free_qty) > 0 && <Badge variant="warning">Free: {line.free_qty}</Badge>}
                        </div>
                      </div>
                      <button onClick={() => removeLine(line.key)} className="shrink-0 text-ink-muted hover:text-danger">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => bumpQty(line, -1)} className="flex h-6 w-6 items-center justify-center rounded border border-border-soft text-ink-muted hover:bg-page">
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={line.qty}
                          onChange={(e) => updateLine(line.key, { qty: e.target.value })}
                          className="w-11 rounded border border-border-soft px-1 py-0.5 text-center text-sm"
                        />
                        <button onClick={() => bumpQty(line, 1)} className="flex h-6 w-6 items-center justify-center rounded border border-border-soft text-ink-muted hover:bg-page">
                          <Plus size={12} />
                        </button>
                        <span className="text-xs text-ink-muted">{units.find((u) => u.id === line.unit_id)?.short_code || ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <input
                          type="number"
                          step="any"
                          disabled={!canEditPrice}
                          value={line.rate}
                          title="Rate"
                          onChange={(e) => updateLine(line.key, { rate: e.target.value })}
                          className="w-14 rounded border border-border-soft px-1 py-0.5 text-right disabled:bg-page"
                        />
                        <span className="w-16 text-right font-semibold text-ink">Rs. {line.priced.line_total.toFixed(2)}</span>
                      </div>
                    </div>
                    {canDiscount && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-muted">
                        <span>Discount</span>
                        <div className="flex overflow-hidden rounded border border-border-soft">
                          <button
                            type="button"
                            onClick={() => updateLine(line.key, { discount_mode: 'percent' })}
                            className={`px-1.5 py-0.5 font-medium ${line.discount_mode !== 'amount' ? 'bg-gold text-white' : 'bg-white text-ink-muted'}`}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => updateLine(line.key, { discount_mode: 'amount' })}
                            className={`px-1.5 py-0.5 font-medium ${line.discount_mode === 'amount' ? 'bg-gold text-white' : 'bg-white text-ink-muted'}`}
                          >
                            Rs.
                          </button>
                        </div>
                        {line.discount_mode === 'amount' ? (
                          <input
                            type="number" min="0" step="any" value={line.discount_amount}
                            onChange={(e) => updateLine(line.key, { discount_amount: e.target.value })}
                            className="w-16 rounded border border-border-soft px-1 py-0.5"
                          />
                        ) : (
                          <input
                            type="number" min="0" step="any" value={line.discount_percent}
                            onChange={(e) => updateLine(line.key, { discount_percent: e.target.value })}
                            className="w-14 rounded border border-border-soft px-1 py-0.5"
                          />
                        )}
                        <span className="ml-2">Free qty</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={line.free_qty}
                          onChange={(e) => updateLine(line.key, { free_qty: e.target.value })}
                          className="w-14 rounded border border-border-soft px-1 py-0.5"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-ink-muted">
                  <PackageX size={28} className="text-ink-muted/40" />
                  Cart is empty — scan or search an item, or tap a product.
                </div>
              )}
            </div>

            <SummaryRow label="Subtotal" value={totals.subtotal} />
            <SummaryRow label={`GST Total${uniformTaxPercent ? ` (${uniformTaxPercent}%)` : ''}`} value={totals.cgst + totals.sgst + totals.cessAmount} />
            <SummaryRow label="Discount" value={totals.discountAmount} />
            <SummaryRow label="Round off" value={totals.roundOff} />

            <div className="mt-2 flex items-center justify-between rounded-lg bg-highlight px-3 py-2.5">
              <span className="font-bold text-ink">Total Amount</span>
              <span className="text-xl font-bold text-ink">Rs. {totals.grandTotal.toFixed(2)}</span>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="mt-4 w-full"
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0}
              shortcut="Ctrl+S"
            >
              Proceed to Payment
            </Button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => saveMutation.mutate()} disabled={cart.length === 0 || saveMutation.isPending}>
                Hold Bill
              </Button>
              <Button variant="secondary" onClick={resetBill} disabled={cart.length === 0}>
                Clear
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {showPaymentModal && (
        <PaymentModal
          totals={totals}
          customerName={customers.find((c) => String(c.id) === String(customerId))?.ledger_name}
          itemCount={pricedLines.length}
          splitMode={splitMode}
          setSplitMode={setSplitMode}
          payments={payments}
          setPayments={setPayments}
          hasCustomer={!!customerId}
          onBack={() => setShowPaymentModal(false)}
          onPay={() => completeMutation.mutate()}
          isPending={completeMutation.isPending}
          error={completeMutation.isError ? completeMutation.error?.response?.data?.error || 'Failed to complete' : null}
        />
      )}

      {printingInvoiceId && <PrintPreviewModal invoiceId={printingInvoiceId} onClose={() => setPrintingInvoiceId(null)} />}
      {showImageSearch && (
        <ImageSearchModal
          onClose={() => setShowImageSearch(false)}
          onAdd={(item) => { addItem(item); setShowImageSearch(false); }}
        />
      )}
    </div>
  );
}

function PaymentModal({ totals, customerName, itemCount, splitMode, setSplitMode, payments, setPayments, hasCustomer, onBack, onPay, isPending, error }) {
  const grandTotal = totals.grandTotal;
  const paymentsTotal = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remaining = Math.round((grandTotal - paymentsTotal) * 100) / 100;

  const toggleSplit = (next) => {
    setSplitMode(next);
    if (next) {
      setPayments(PAYMENT_METHODS.map((m) => ({ payment_method: m.key, amount: m.key === 'cash' ? grandTotal : 0, reference_no: '' })));
    } else {
      setPayments([{ payment_method: 'cash', amount: grandTotal, reference_no: '' }]);
    }
  };

  const getAmount = (key) => Number(payments.find((p) => p.payment_method === key)?.amount || 0);

  const setSplitAmount = (key, raw) => {
    let value = Number(raw);
    if (Number.isNaN(value) || value < 0) value = 0;
    setPayments((prev) => {
      const othersTotal = prev.filter((p) => p.payment_method !== key).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const capped = Math.min(value, Math.max(0, grandTotal - othersTotal));
      const exists = prev.some((p) => p.payment_method === key);
      return exists
        ? prev.map((p) => (p.payment_method === key ? { ...p, amount: capped } : p))
        : [...prev, { payment_method: key, amount: capped, reference_no: '' }];
    });
  };

  const singleMethod = payments[0]?.payment_method || 'cash';
  const singleAmount = payments[0]?.amount ?? grandTotal;

  const setSingleAmount = (raw) => {
    let value = Number(raw);
    if (Number.isNaN(value) || value < 0) value = 0;
    if (value > grandTotal) value = grandTotal;
    setPayments((prev) => [{ ...prev[0], amount: value }]);
  };

  const blockedNoCustomer = remaining > 0.009 && !hasCustomer;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto card p-5">
        <div className="mb-3">
          <div className="text-lg font-semibold text-ink">Payment</div>
          <div className="text-xs text-ink-muted">{customerName || 'Walk-in Customer'} · {itemCount} item(s)</div>
        </div>

        <div className="mb-4 rounded-lg bg-highlight px-3 py-3 text-center">
          <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">Total Payable</div>
          <div className="text-2xl font-bold text-ink">Rs. {grandTotal.toFixed(2)}</div>
        </div>

        <div className="mb-3 flex overflow-hidden rounded-lg border border-border-soft bg-page p-1 text-sm">
          <button onClick={() => toggleSplit(false)} className={`flex-1 rounded px-3 py-1.5 font-medium ${!splitMode ? 'bg-white shadow-sm text-ink' : 'text-ink-muted'}`}>
            Single Payment
          </button>
          <button onClick={() => toggleSplit(true)} className={`flex-1 rounded px-3 py-1.5 font-medium ${splitMode ? 'bg-white shadow-sm text-ink' : 'text-ink-muted'}`}>
            Split Payment
          </button>
        </div>

        {!splitMode ? (
          <>
            <div className="mb-1 text-xs font-medium text-ink-muted">Payment Method</div>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setPayments((prev) => [{ ...prev[0], payment_method: m.key }])}
                  className={`rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors ${
                    singleMethod === m.key ? 'border-gold bg-gold/10 text-gold' : 'border-border-soft bg-white text-ink-muted hover:bg-page'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="mb-1 text-xs font-medium text-ink-muted">Amount</div>
            <input
              type="number"
              min="0"
              step="any"
              value={singleAmount}
              onChange={(e) => setSingleAmount(e.target.value)}
              className="input mb-3 text-lg font-semibold"
            />
          </>
        ) : (
          <div className="mb-3 flex flex-col gap-2">
            {PAYMENT_METHODS.map((m) => (
              <div key={m.key} className="flex items-center justify-between gap-2">
                <span className="w-14 text-sm font-medium text-ink">{m.label}</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={getAmount(m.key)}
                  onChange={(e) => setSplitAmount(m.key, e.target.value)}
                  className="input flex-1 text-right"
                />
              </div>
            ))}
          </div>
        )}

        <div className="mb-1 flex justify-between text-sm text-ink-muted">
          <span>Total Bill</span><span>Rs. {grandTotal.toFixed(2)}</span>
        </div>
        <div className="mb-1 flex justify-between text-sm text-ink-muted">
          <span>Paid</span><span className="font-medium text-ink">Rs. {paymentsTotal.toFixed(2)}</span>
        </div>
        <div className={`mb-3 flex justify-between rounded-lg px-3 py-2 text-sm font-semibold ${remaining > 0.009 ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success'}`}>
          <span>{remaining > 0.009 ? 'Remaining (on credit)' : 'Fully Paid'}</span>
          <span>Rs. {Math.max(remaining, 0).toFixed(2)}</span>
        </div>

        {blockedNoCustomer && (
          <p className="mb-2 text-xs text-danger">Select a customer above to allow a partial/credit payment — a walk-in sale must be paid in full.</p>
        )}
        {error && <p className="mb-2 text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onBack} disabled={isPending}>Back</Button>
          <Button onClick={onPay} disabled={isPending || blockedNoCustomer}>Pay Now</Button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between py-0.5 text-sm text-ink-muted">
      <span>{label}</span>
      <span className="text-ink">{Number(value).toFixed(2)}</span>
    </div>
  );
}
