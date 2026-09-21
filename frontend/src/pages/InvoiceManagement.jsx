import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Printer, Ban, Search } from 'lucide-react';
import { invoicesApi } from '../api/invoices';
import { Card } from '../components/Card.jsx';
import { Badge } from '../components/Badge.jsx';
import { Button } from '../components/Button.jsx';
import { PrintPreviewModal } from '../components/PrintPreviewModal.jsx';
import { usePermission } from '../hooks/usePermission';

const STATUS_VARIANT = {
  paid: 'success', partial: 'warning', credit: 'gold', cancelled: 'danger', returned: 'danger',
};

function ViewModal({ id, onClose }) {
  const { data } = useQuery({ queryKey: ['invoice', id], queryFn: () => invoicesApi.get(id) });
  if (!data) return null;
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[85vh] w-[640px] overflow-auto card p-5">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-lg font-semibold text-ink">{data.invoice_no || `Held #${data.id}`}</span>
          <Badge variant={STATUS_VARIANT[data.payment_status] || 'neutral'}>{data.payment_status || data.status}</Badge>
        </div>
        <div className="mb-3 text-xs text-ink-muted">
          {data.customer_name || 'Walk-in'} · {data.invoice_date} · Billed by {data.employee_name}
        </div>
        <table className="mb-3 w-full text-xs">
          <thead>
            <tr className="border-b border-border-soft text-left text-ink-muted">
              <th className="py-1">Item</th><th className="py-1">Qty</th><th className="py-1">Rate</th><th className="py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((line) => (
              <tr key={line.id} className="border-b border-border-soft">
                <td className="py-1">{line.item_name_snapshot}</td>
                <td className="py-1">{line.qty} {line.unit_code}</td>
                <td className="py-1">{line.rate}</td>
                <td className="py-1">{line.line_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mb-3 flex justify-end text-sm font-semibold text-ink">Grand Total: Rs. {data.grand_total}</div>
        {data.status === 'cancelled' && (
          <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-danger">
            Cancelled by {data.cancelled_by_name || 'user'} on {data.cancelled_at}{data.cancel_reason ? ` — ${data.cancel_reason}` : ''}
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

export function InvoiceManagement() {
  const canCancel = usePermission('pos.cancel_completed_invoice');
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [viewingId, setViewingId] = useState(null);
  const [printingId, setPrintingId] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [cancelError, setCancelError] = useState('');

  const invoicesQuery = useQuery({ queryKey: ['invoices', statusFilter], queryFn: () => invoicesApi.list(statusFilter || undefined) });
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => invoicesApi.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setCancelling(null);
      setCancelError('');
    },
    onError: (err) => setCancelError(err?.response?.data?.error || 'Failed to cancel'),
  });

  const invoices = invoicesQuery.data || [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter(
      (inv) =>
        (inv.invoice_no || '').toLowerCase().includes(q) ||
        (inv.customer_name || '').toLowerCase().includes(q)
    );
  }, [invoices, search]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-ink">Invoice Management</h1>
      <p className="mb-4 text-sm text-ink-muted">Search, view, print and cancel invoices.</p>

      <Card
        title="Invoices"
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-ink-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice # or customer"
                className="input w-56 pl-8 text-sm"
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-40 text-sm">
              <option value="">All statuses</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="returned">Returned</option>
            </select>
          </div>
        }
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft text-left text-xs uppercase text-ink-muted">
              <th className="px-4 py-2">Invoice #</th><th className="px-4 py-2">Customer</th><th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Total</th><th className="px-4 py-2">Payment</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => (
              <tr key={inv.id} className="border-b border-border-soft">
                <td className="px-4 py-2 font-medium text-ink">{inv.invoice_no || `Held #${inv.id}`}</td>
                <td className="px-4 py-2">{inv.customer_name || 'Walk-in'}</td>
                <td className="px-4 py-2 text-ink-muted">{inv.invoice_date}</td>
                <td className="px-4 py-2">{inv.grand_total}</td>
                <td className="px-4 py-2"><Badge variant={STATUS_VARIANT[inv.payment_status] || 'neutral'}>{inv.payment_status || '-'}</Badge></td>
                <td className="px-4 py-2 capitalize">{inv.status}</td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-2">
                    <button title="View" onClick={() => setViewingId(inv.id)} className="text-ink-muted hover:text-ink">
                      <Eye size={16} />
                    </button>
                    <button title="Print" onClick={() => setPrintingId(inv.id)} className="text-ink-muted hover:text-ink">
                      <Printer size={16} />
                    </button>
                    {canCancel && inv.status === 'completed' && (
                      <button title="Cancel" onClick={() => { setCancelling(inv); setCancelError(''); }} className="text-danger hover:text-red-700">
                        <Ban size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-ink-muted">No invoices found.</td></tr>}
          </tbody>
        </table>
      </Card>

      {viewingId && <ViewModal id={viewingId} onClose={() => setViewingId(null)} />}
      {printingId && <PrintPreviewModal invoiceId={printingId} onClose={() => setPrintingId(null)} />}
      {cancelling && (
        <CancelModal
          invoice={cancelling}
          error={cancelError}
          onClose={() => setCancelling(null)}
          onConfirm={(reason) => cancelMutation.mutate({ id: cancelling.id, reason })}
        />
      )}
    </div>
  );
}
