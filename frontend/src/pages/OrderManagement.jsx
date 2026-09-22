import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Plus, Trash2, Eye, Printer, Ban, CheckCircle2, Image as ImageIcon, X } from 'lucide-react';
import { itemsApi } from '../api/catalog';
import { customersApi, suppliersApi, routesApi } from '../api/parties';
import { usersApi } from '../api/users';
import { purchaseRequestsApi, purchasesApi, routeSuppliersApi, customerPrebookingsApi } from '../api/purchasing';
import { resolveImageUrl } from '../utils/media';
import { Tabs } from '../components/Tabs.jsx';
import { Card } from '../components/Card.jsx';
import { Badge } from '../components/Badge.jsx';
import { Button } from '../components/Button.jsx';
import { usePermission } from '../hooks/usePermission';

const BOOKING_SOURCES = [
  { value: 'direct', label: 'Direct Walk-in' },
  { value: 'salesman', label: 'Salesman' },
  { value: 'phone', label: 'Phone' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

const PREBOOKING_STATUS_VARIANT = {
  pending: 'warning', confirmed: 'gold', processing: 'gold', ready: 'success', completed: 'success', cancelled: 'danger',
};
const PREBOOKING_NEXT_STATUS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
};

const REQUEST_STATUS_VARIANT = {
  open: 'warning', approved: 'gold', partially_received: 'gold', converted_to_grn: 'success', cancelled: 'danger',
};

function ItemLineEditor({ lines, setLines, items, rateLabel = 'Rate' }) {
  const addLine = () => setLines((prev) => [...prev, { item_id: '', qty: 1, rate: 0 }]);
  const updateLine = (idx, patch) => setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));
  const itemById = (id) => items.find((i) => i.id === Number(id));

  return (
    <div className="flex flex-col gap-2">
      {lines.map((line, idx) => {
        const item = itemById(line.item_id);
        const lineTotal = Number(line.qty || 0) * Number(line.rate || 0);
        return (
          <div key={idx} className="flex flex-wrap items-center gap-2 rounded-lg border border-border-soft p-2">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded bg-page">
              {item?.image ? <img src={resolveImageUrl(item.image)} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={14} className="text-ink-muted" />}
            </div>
            <select
              value={line.item_id}
              onChange={(e) => {
                const picked = itemById(e.target.value);
                updateLine(idx, { item_id: e.target.value, rate: picked ? picked.retail_price : line.rate });
              }}
              className="input w-48"
            >
              <option value="">Select item</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.item_name} ({i.item_code})</option>)}
            </select>
            <input type="number" step="any" min="0" placeholder="Qty" value={line.qty} onChange={(e) => updateLine(idx, { qty: e.target.value })} className="input w-20" />
            <input type="number" step="any" min="0" placeholder={rateLabel} value={line.rate} onChange={(e) => updateLine(idx, { rate: e.target.value })} className="input w-24" />
            {item?.gst_percent > 0 && <Badge variant="gst">GST {item.gst_percent}%</Badge>}
            <span className="ml-auto text-sm font-semibold text-ink">Rs. {lineTotal.toFixed(2)}</span>
            <button onClick={() => removeLine(idx)} className="text-danger"><Trash2 size={14} /></button>
          </div>
        );
      })}
      <button onClick={addLine} className="self-start text-xs font-medium text-gold hover:underline">+ Add item</button>
    </div>
  );
}

// ---------------------------------------------------------------------
// Customer Pre-Booking
// ---------------------------------------------------------------------

function PrebookingPrintView({ data, onClose }) {
  const subtotal = data.items.reduce((s, l) => s + Number(l.qty) * Number(l.rate), 0);
  const gst = data.items.reduce((s, l) => s + Number(l.qty) * Number(l.rate) * (Number(l.tax_percent) / 100), 0);
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-white p-8 text-sm text-ink shadow-xl print:max-h-none print:shadow-none">
        <div className="mb-1 flex items-center justify-between print:hidden">
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
          <Button size="sm" onClick={() => window.print()}>Print</Button>
        </div>
        <div className="mb-4 text-center">
          <div className="font-display text-2xl font-bold text-gold">AJ AGENCY</div>
          <div className="text-xs text-ink-muted">Distributor Management System</div>
          <div className="mt-2 inline-block rounded bg-page px-3 py-1 text-xs font-bold uppercase tracking-wide">Pre-Booking / Order Request</div>
          <div className="text-[10px] font-semibold uppercase text-danger">Not an invoice</div>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div><b>Order Number:</b> {data.prebooking_no}</div>
          <div><b>Date:</b> {data.created_at}</div>
          <div><b>Customer:</b> {data.customer_name}</div>
          <div><b>Phone:</b> {data.customer_phone || '-'}</div>
          <div><b>Route:</b> {data.route_name || '-'}</div>
          <div><b>Booking Source:</b> {data.booking_source}</div>
          <div><b>Salesman/Employee:</b> {data.employee_name || '-'}</div>
          <div><b>Status:</b> {data.status}</div>
        </div>
        <table className="mb-3 w-full border-collapse text-xs">
          <thead>
            <tr className="border-y border-ink/30 text-left">
              <th className="py-1">S.No</th><th className="py-1">Product</th><th className="py-1">Code</th>
              <th className="py-1">Qty</th><th className="py-1">Rate</th><th className="py-1">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((l, idx) => (
              <tr key={l.id} className="border-b border-ink/10">
                <td className="py-1">{idx + 1}</td>
                <td className="py-1">{l.item_name}</td>
                <td className="py-1">{l.item_code}</td>
                <td className="py-1">{l.qty}</td>
                <td className="py-1">{l.rate}</td>
                <td className="py-1">{(Number(l.qty) * Number(l.rate)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mb-3 flex justify-end">
          <div className="w-48 text-xs">
            <div className="flex justify-between"><span>Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>GST</span><span>{gst.toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-ink/30 pt-1 font-bold"><span>Estimated Total</span><span>{(subtotal + gst).toFixed(2)}</span></div>
          </div>
        </div>
        {data.notes && <div className="mb-3 text-xs"><b>Notes / Instructions:</b> {data.notes}</div>}
        <div className="text-xs text-ink-muted">Created by {data.created_by_name}</div>
      </div>
    </div>
  );
}

function PrebookingFormModal({ booking, onClose }) {
  const isEdit = !!booking;
  const queryClient = useQueryClient();
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: customersApi.list });
  const routesQuery = useQuery({ queryKey: ['routes'], queryFn: routesApi.list });
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: usersApi.list });
  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list('') });

  const [customerId, setCustomerId] = useState(booking?.customer_id ?? '');
  const [routeId, setRouteId] = useState(booking?.route_id ?? '');
  const [employeeId, setEmployeeId] = useState(booking?.employee_id ?? '');
  const [bookingSource, setBookingSource] = useState(booking?.booking_source ?? 'direct');
  const [notes, setNotes] = useState(booking?.notes ?? '');
  const [lines, setLines] = useState(
    booking?.items?.map((l) => ({ item_id: l.item_id, qty: Number(l.qty), rate: Number(l.rate) })) ?? [{ item_id: '', qty: 1, rate: 0 }]
  );
  const [error, setError] = useState('');

  const items = itemsQuery.data || [];
  const customers = customersQuery.data || [];
  const routes = routesQuery.data || [];
  const users = usersQuery.data || [];

  const validLines = lines.filter((l) => l.item_id);
  const subtotal = validLines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.rate || 0), 0);
  const gst = validLines.reduce((s, l) => {
    const item = items.find((i) => i.id === Number(l.item_id));
    return s + Number(l.qty || 0) * Number(l.rate || 0) * (Number(item?.gst_percent || 0) / 100);
  }, 0);

  const createMutation = useMutation({ mutationFn: customerPrebookingsApi.create });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => customerPrebookingsApi.update(id, data) });

  const submit = async () => {
    setError('');
    const payload = {
      customer_id: Number(customerId),
      route_id: routeId ? Number(routeId) : null,
      employee_id: employeeId ? Number(employeeId) : null,
      booking_source: bookingSource,
      notes: notes || null,
      items: validLines.map((l) => ({ item_id: Number(l.item_id), qty: Number(l.qty), rate: Number(l.rate) })),
    };
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: booking.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      queryClient.invalidateQueries({ queryKey: ['customer-prebookings'] });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save');
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold text-ink">{isEdit ? `Edit ${booking.prebooking_no}` : 'New Customer Pre-Booking'}</div>
          <button onClick={onClose} className="rounded p-1 text-ink-muted hover:bg-page"><X size={18} /></button>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Customer *</span>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input">
              <option value="">Select customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.ledger_name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Booking Source</span>
            <select value={bookingSource} onChange={(e) => setBookingSource(e.target.value)} className="input">
              {BOOKING_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Route</span>
            <select value={routeId} onChange={(e) => setRouteId(e.target.value)} className="input">
              <option value="">--</option>
              {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Salesman / Employee</span>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="input">
              <option value="">--</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
        </div>

        <div className="mb-3">
          <div className="mb-1 text-xs font-medium text-ink-muted">Items</div>
          <ItemLineEditor lines={lines} setLines={setLines} items={items} />
        </div>

        <label className="mb-3 flex flex-col gap-1">
          <span className="text-xs font-medium text-ink-muted">Notes / Instructions</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input h-16 resize-none" />
        </label>

        <div className="mb-3 rounded-lg bg-page p-3 text-sm">
          <div className="flex justify-between text-ink-muted"><span>Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-ink-muted"><span>GST</span><span>{gst.toFixed(2)}</span></div>
          <div className="mt-1 flex justify-between border-t border-border-soft pt-1 font-bold text-ink"><span>Estimated Grand Total</span><span>Rs. {(subtotal + gst).toFixed(2)}</span></div>
        </div>

        {error && <p className="mb-2 text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!customerId || validLines.length === 0}>
            {isEdit ? 'Save Changes' : 'Create Pre-Booking'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CustomerPrebookingPanel() {
  const canCreate = usePermission('orders.create_prebooking');
  const canManageStatus = usePermission('orders.manage_prebooking_status');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(undefined); // undefined=closed, null=create, obj=edit
  const [printingId, setPrintingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);

  const listQuery = useQuery({ queryKey: ['customer-prebookings'], queryFn: customerPrebookingsApi.list });
  const printQuery = useQuery({ queryKey: ['customer-prebooking', printingId], queryFn: () => customerPrebookingsApi.get(printingId), enabled: !!printingId });
  const viewQuery = useQuery({ queryKey: ['customer-prebooking', viewingId], queryFn: () => customerPrebookingsApi.get(viewingId), enabled: !!viewingId });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => customerPrebookingsApi.setStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customer-prebookings'] }),
  });
  const cancelMutation = useMutation({
    mutationFn: (id) => customerPrebookingsApi.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customer-prebookings'] }),
  });

  const openEdit = async (row) => {
    const full = await customerPrebookingsApi.get(row.id);
    setModal(full);
  };

  const rows = (listQuery.data || []).filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (r.prebooking_no || '').toLowerCase().includes(q) || (r.customer_name || '').toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-4">
      <Card
        title="Customer Pre-Booking Orders"
        actions={
          <div className="flex items-center gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order # or customer" className="input w-56 text-sm" />
            <Button variant="secondary" size="sm" onClick={() => customerPrebookingsApi.downloadExport()}>Export Excel</Button>
            {canCreate && <Button size="sm" icon={<Plus size={14} />} onClick={() => setModal(null)}>New Pre-Booking</Button>}
          </div>
        }
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft text-left text-xs uppercase text-ink-muted">
              <th className="px-4 py-2">Order #</th><th className="px-4 py-2">Date</th><th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Route</th><th className="px-4 py-2">Salesman</th><th className="px-4 py-2">Items</th>
              <th className="px-4 py-2">Est. Total</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border-soft">
                <td className="px-4 py-2 font-medium text-ink">{r.prebooking_no}</td>
                <td className="px-4 py-2 text-ink-muted">{r.created_at?.slice(0, 10)}</td>
                <td className="px-4 py-2">{r.customer_name}</td>
                <td className="px-4 py-2 text-ink-muted">{r.route_name || '-'}</td>
                <td className="px-4 py-2 text-ink-muted">{r.employee_name || '-'}</td>
                <td className="px-4 py-2">{r.item_count}</td>
                <td className="px-4 py-2">Rs. {Number(r.estimated_total).toFixed(2)}</td>
                <td className="px-4 py-2"><Badge variant={PREBOOKING_STATUS_VARIANT[r.status]}>{r.status}</Badge></td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button title="View" onClick={() => setViewingId(r.id)} className="text-ink-muted hover:text-ink"><Eye size={16} /></button>
                    <button title="Print" onClick={() => setPrintingId(r.id)} className="text-ink-muted hover:text-ink"><Printer size={16} /></button>
                    {canCreate && r.status === 'pending' && (
                      <button title="Edit" onClick={() => openEdit(r)} className="text-ink-muted hover:text-gold">
                        <Plus size={16} className="rotate-45" />
                      </button>
                    )}
                    {canManageStatus && PREBOOKING_NEXT_STATUS[r.status]?.filter((s) => s !== 'cancelled').map((next) => (
                      <button key={next} title={`Mark ${next}`} onClick={() => statusMutation.mutate({ id: r.id, status: next })} className="text-ink-muted hover:text-success">
                        <CheckCircle2 size={16} />
                      </button>
                    ))}
                    {canManageStatus && PREBOOKING_NEXT_STATUS[r.status]?.includes('cancelled') && (
                      <button title="Cancel" onClick={() => cancelMutation.mutate(r.id)} className="text-danger hover:text-red-700"><Ban size={16} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-ink-muted">No pre-bookings yet.</td></tr>}
          </tbody>
        </table>
      </Card>

      {modal !== undefined && <PrebookingFormModal booking={modal} onClose={() => setModal(undefined)} />}
      {printingId && printQuery.data && <PrebookingPrintView data={printQuery.data} onClose={() => setPrintingId(null)} />}
      {viewingId && viewQuery.data && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[85vh] w-[560px] overflow-auto card p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-lg font-semibold text-ink">{viewQuery.data.prebooking_no}</span>
              <Badge variant={PREBOOKING_STATUS_VARIANT[viewQuery.data.status]}>{viewQuery.data.status}</Badge>
            </div>
            <div className="mb-3 text-xs text-ink-muted">
              {viewQuery.data.customer_name} · {viewQuery.data.route_name || 'No route'} · via {viewQuery.data.booking_source}
            </div>
            <table className="mb-3 w-full text-xs">
              <thead><tr className="border-b border-border-soft text-left text-ink-muted"><th className="py-1">Item</th><th className="py-1">Qty</th><th className="py-1">Rate</th></tr></thead>
              <tbody>
                {viewQuery.data.items.map((l) => (
                  <tr key={l.id} className="border-b border-border-soft"><td className="py-1">{l.item_name}</td><td className="py-1">{l.qty}</td><td className="py-1">{l.rate}</td></tr>
                ))}
              </tbody>
            </table>
            {viewQuery.data.notes && <p className="mb-3 text-xs text-ink-muted">Notes: {viewQuery.data.notes}</p>}
            <div className="flex justify-end"><Button variant="secondary" onClick={() => setViewingId(null)}>Close</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Supplier Purchase Requests / Indents
// ---------------------------------------------------------------------

function RequestPrintView({ data, onClose }) {
  const total = data.items.reduce((s, l) => s + Number(l.qty) * Number(l.rate), 0);
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-white p-8 text-sm text-ink shadow-xl print:max-h-none print:shadow-none">
        <div className="mb-1 flex items-center justify-between print:hidden">
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
          <Button size="sm" onClick={() => window.print()}>Print</Button>
        </div>
        <div className="mb-4 text-center">
          <div className="font-display text-2xl font-bold text-gold">AJ AGENCY</div>
          <div className="text-xs text-ink-muted">Distributor Management System</div>
          <div className="mt-2 inline-block rounded bg-page px-3 py-1 text-xs font-bold uppercase tracking-wide">Supplier Purchase Request / Indent</div>
          <div className="text-[10px] font-semibold uppercase text-danger">Not a purchase invoice · Not a GRN</div>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div><b>Request No:</b> {data.request_no}</div>
          <div><b>Date:</b> {data.created_at}</div>
          <div><b>Supplier:</b> {data.supplier_name}</div>
          <div><b>Supplier Phone:</b> {data.supplier_phone || '-'}</div>
          <div><b>Route:</b> {data.route_name || '-'}</div>
          <div><b>Requested By:</b> {data.created_by_name}</div>
          <div><b>Status:</b> {data.status}</div>
        </div>
        <table className="mb-3 w-full border-collapse text-xs">
          <thead><tr className="border-y border-ink/30 text-left"><th className="py-1">S.No</th><th className="py-1">Product</th><th className="py-1">Code</th><th className="py-1">Requested Qty</th><th className="py-1">Purchase Rate</th><th className="py-1">Est. Amount</th></tr></thead>
          <tbody>
            {data.items.map((l, idx) => (
              <tr key={l.id} className="border-b border-ink/10">
                <td className="py-1">{idx + 1}</td><td className="py-1">{l.item_name}</td><td className="py-1">{l.item_code}</td>
                <td className="py-1">{l.qty}</td><td className="py-1">{l.rate}</td><td className="py-1">{(Number(l.qty) * Number(l.rate)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mb-3 flex justify-end text-sm font-bold">Total Estimated Amount: Rs. {total.toFixed(2)}</div>
        {data.notes && <div className="mb-3 text-xs"><b>Notes / Remarks:</b> {data.notes}</div>}
      </div>
    </div>
  );
}

function ConvertToGrnModal({ request, onClose }) {
  const queryClient = useQueryClient();
  const [paymentMode, setPaymentMode] = useState('credit');
  const [paidAmount, setPaidAmount] = useState(0);
  const [lines, setLines] = useState(request.items.map((l) => ({ item_id: l.item_id, item_name: l.item_name, qty: Number(l.qty), rate: Number(l.rate), free_qty: 0, tax_percent: 0 })));
  const [error, setError] = useState('');

  const createMutation = useMutation({ mutationFn: purchasesApi.create });

  const total = lines.reduce((s, l) => s + Number(l.qty) * Number(l.rate), 0);

  const submit = async () => {
    setError('');
    try {
      await createMutation.mutateAsync({
        purchase_request_id: request.id,
        supplier_id: request.supplier_id,
        payment_mode: paymentMode,
        paid_amount: Number(paidAmount || 0),
        items: lines.map((l) => ({ item_id: l.item_id, qty: Number(l.qty), rate: Number(l.rate), free_qty: Number(l.free_qty || 0), tax_percent: Number(l.tax_percent || 0) })),
      });
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create GRN');
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto card p-5">
        <div className="mb-3 text-lg font-semibold text-ink">Create Inward GRN from {request.request_no}</div>
        <p className="mb-3 text-xs text-ink-muted">Requested quantities/rates are pre-filled — adjust to what was actually received before confirming. Stock increases only after this GRN is saved.</p>
        <div className="mb-3 flex flex-col gap-2">
          {lines.map((l, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-lg border border-border-soft p-2 text-sm">
              <span className="min-w-[140px] flex-1">{l.item_name}</span>
              <label className="flex items-center gap-1 text-xs text-ink-muted">Qty
                <input type="number" step="any" value={l.qty} onChange={(e) => setLines((p) => p.map((x, i) => (i === idx ? { ...x, qty: e.target.value } : x)))} className="w-20 rounded border border-border-soft px-1 py-0.5" />
              </label>
              <label className="flex items-center gap-1 text-xs text-ink-muted">Rate
                <input type="number" step="any" value={l.rate} onChange={(e) => setLines((p) => p.map((x, i) => (i === idx ? { ...x, rate: e.target.value } : x)))} className="w-20 rounded border border-border-soft px-1 py-0.5" />
              </label>
              <span className="font-semibold text-ink">Rs. {(Number(l.qty) * Number(l.rate)).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="input w-40">
            <option value="credit">Credit</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="upi">UPI</option>
          </select>
          <input type="number" step="any" placeholder="Paid amount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="input w-32" />
        </div>
        <div className="mb-3 text-right text-sm font-bold text-ink">Actual Purchase Total: Rs. {total.toFixed(2)}</div>
        {error && <p className="mb-2 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={createMutation.isPending}>Create GRN &amp; Increase Stock</Button>
        </div>
      </div>
    </div>
  );
}

function SupplierRequestPanel() {
  const canCreate = usePermission('orders.create_purchase_indent');
  const canApprove = usePermission('orders.approve_purchase_request');
  const canGrn = usePermission('purchases.create_grn');
  const queryClient = useQueryClient();

  const [routeId, setRouteId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ item_id: '', qty: 1, rate: 0 }]);
  const [error, setError] = useState('');
  const [printingId, setPrintingId] = useState(null);
  const [converting, setConverting] = useState(null);

  const requestsQuery = useQuery({ queryKey: ['purchase-requests'], queryFn: purchaseRequestsApi.list });
  const routesQuery = useQuery({ queryKey: ['routes'], queryFn: routesApi.list });
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: suppliersApi.list });
  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list('') });
  const mappedSuppliersQuery = useQuery({
    queryKey: ['route-suppliers', routeId],
    queryFn: () => routeSuppliersApi.get(routeId),
    enabled: !!routeId,
  });
  const printQuery = useQuery({ queryKey: ['purchase-request', printingId], queryFn: () => purchaseRequestsApi.get(printingId), enabled: !!printingId });

  const createMutation = useMutation({
    mutationFn: purchaseRequestsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      setSupplierId(''); setNotes(''); setLines([{ item_id: '', qty: 1, rate: 0 }]);
    },
  });
  const cancelMutation = useMutation({
    mutationFn: purchaseRequestsApi.cancel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-requests'] }),
  });
  const approveMutation = useMutation({
    mutationFn: purchaseRequestsApi.approve,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-requests'] }),
  });

  const allSuppliers = suppliersQuery.data || [];
  const mappedIds = mappedSuppliersQuery.data?.supplier_ids;
  // No mapping configured for this route yet -> show every supplier
  // rather than silently hiding the field (fails open, not closed).
  const suppliers = routeId && mappedIds && mappedIds.length > 0
    ? allSuppliers.filter((s) => mappedIds.includes(s.id))
    : allSuppliers;

  const requests = requestsQuery.data || [];
  const items = itemsQuery.data || [];
  const routes = routesQuery.data || [];

  const submit = async () => {
    setError('');
    try {
      await createMutation.mutateAsync({
        supplier_id: Number(supplierId),
        route_id: routeId ? Number(routeId) : null,
        notes: notes || null,
        items: lines.filter((l) => l.item_id).map((l) => ({ item_id: Number(l.item_id), qty: Number(l.qty), rate: Number(l.rate) })),
      });
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {canCreate && (
        <div className="card p-4">
          <div className="mb-3 font-semibold text-ink">New Supplier Purchase Request</div>
          <div className="mb-3 flex flex-wrap gap-2">
            <select value={routeId} onChange={(e) => { setRouteId(e.target.value); setSupplierId(''); }} className="input w-48">
              <option value="">Route (optional)</option>
              {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="input w-56">
              <option value="">Select supplier{routeId ? ' (mapped to route)' : ''}</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <ItemLineEditor lines={lines} setLines={setLines} items={items} rateLabel="Purchase Rate" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Remarks (e.g. urgent stock requirement)" className="input mt-3 h-16 w-full resize-none" />
          <Button className="mt-3" onClick={submit} disabled={!supplierId || createMutation.isPending}>Generate Purchase Request</Button>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
      )}

      <div className="card">
        <div className="border-b border-border-soft px-4 py-3 font-semibold text-ink">Supplier Purchase Requests</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft text-left text-xs uppercase text-ink-muted">
              <th className="px-4 py-2">Request #</th><th className="px-4 py-2">Supplier</th><th className="px-4 py-2">Route</th>
              <th className="px-4 py-2">Items</th><th className="px-4 py-2">Est. Total</th><th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Date</th><th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b border-border-soft">
                <td className="px-4 py-2">{r.request_no}</td>
                <td className="px-4 py-2">{r.supplier_name}</td>
                <td className="px-4 py-2 text-ink-muted">{r.route_name || '-'}</td>
                <td className="px-4 py-2">{r.item_count}</td>
                <td className="px-4 py-2">Rs. {Number(r.estimated_total).toFixed(2)}</td>
                <td className="px-4 py-2"><Badge variant={REQUEST_STATUS_VARIANT[r.status]}>{r.status.replace(/_/g, ' ')}</Badge></td>
                <td className="px-4 py-2 text-ink-muted">{r.created_at?.slice(0, 10)}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button title="Print" onClick={() => setPrintingId(r.id)} className="text-ink-muted hover:text-ink"><Printer size={16} /></button>
                    {canApprove && r.status === 'open' && (
                      <button title="Approve" onClick={() => approveMutation.mutate(r.id)} className="text-ink-muted hover:text-success"><CheckCircle2 size={16} /></button>
                    )}
                    {canGrn && r.status === 'approved' && (
                      <button title="Create GRN" onClick={async () => setConverting(await purchaseRequestsApi.get(r.id))} className="text-xs font-semibold text-gold hover:underline">
                        Create GRN
                      </button>
                    )}
                    {canCreate && r.status === 'open' && (
                      <button title="Cancel" onClick={() => cancelMutation.mutate(r.id)} className="text-danger hover:text-red-700"><Ban size={16} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {requests.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-ink-muted">No requests yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {printingId && printQuery.data && <RequestPrintView data={printQuery.data} onClose={() => setPrintingId(null)} />}
      {converting && <ConvertToGrnModal request={converting} onClose={() => setConverting(null)} />}
    </div>
  );
}

export function OrderManagement() {
  const queryClient = useQueryClient();
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Orders &amp; Indents Management</h1>
          <p className="text-sm text-ink-muted">Customer pre-bookings and supplier purchase requests — pending business before a sale or purchase happens.</p>
        </div>
        <Button
          variant="secondary"
          icon={<RefreshCw size={14} />}
          onClick={() => queryClient.invalidateQueries({ queryKey: ['customer-prebookings'] }) || queryClient.invalidateQueries({ queryKey: ['purchase-requests'] })}
        >
          Refresh
        </Button>
      </div>
      <Tabs
        tabs={[
          { key: 'prebooking', label: 'Customer Pre-Booking Orders', content: <CustomerPrebookingPanel /> },
          { key: 'requests', label: 'Supplier Purchase Requests / Indents', content: <SupplierRequestPanel /> },
        ]}
      />
    </div>
  );
}
