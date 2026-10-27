import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList,
  Truck,
  Search,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ChevronRight,
  Package,
  User,
  Users,
  History,
  Phone,
  FileText,
  RotateCcw,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePermission } from '../hooks/usePermission';
import { customersApi } from '../api/parties';
import { itemsApi } from '../api/catalog';
import { vanStockApi, customerPrebookingsApi } from '../api/purchasing';
import { Button } from './Button.jsx';

/**
 * Mobile-First New Customer Order Creation Dialog
 * No live stock quantities or warehouse stock indicators shown to Field Sales Executives.
 * Admin verifies product availability and handles stock confirmation.
 */
function MobileCustomerOrderModal({ onClose }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [bookingSource, setBookingSource] = useState('salesman');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ item_id: '', qty: 1, rate: 0 }]);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: customersApi.list });
  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list('') });

  const customers = customersQuery.data || [];
  const items = Array.isArray(itemsQuery.data) ? itemsQuery.data : (itemsQuery.data?.items || []);

  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase();
    return (
      (c.ledger_name || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    );
  });

  const selectedCustomer = customers.find((c) => String(c.id) === String(customerId));

  const addLine = () => setLines((prev) => [...prev, { item_id: '', qty: 1, rate: 0 }]);
  const updateLine = (idx, patch) => setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const removeLine = (idx) => setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const createMutation = useMutation({
    mutationFn: customerPrebookingsApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-prebookings'] });
      setSuccessMsg(`Customer Order ${data?.prebooking_no || ''} submitted successfully!`);
      setTimeout(() => {
        onClose();
      }, 1500);
    },
    onError: (err) => {
      setFormError(err?.response?.data?.error || 'Failed to submit order request');
    },
  });

  const validLines = lines.filter((l) => l.item_id && Number(l.qty) > 0);
  const estimatedTotal = validLines.reduce((sum, l) => sum + Number(l.qty) * Number(l.rate || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    if (!customerId) {
      setFormError('Please select a customer.');
      return;
    }
    if (validLines.length === 0) {
      setFormError('Please add at least one product with a valid quantity.');
      return;
    }

    createMutation.mutate({
      customer_id: Number(customerId),
      employee_id: user?.id ? Number(user.id) : null,
      booking_source: bookingSource,
      notes: notes || null,
      items: validLines.map((l) => ({
        item_id: Number(l.item_id),
        qty: Number(l.qty),
        rate: Number(l.rate),
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-xl max-h-[92vh] sm:max-h-[88vh] rounded-t-3xl sm:rounded-3xl bg-white flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border-soft px-4 py-3 bg-[#351442] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#8244AD] text-white">
              <ClipboardList size={17} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">New Customer Order</h2>
              <p className="text-[10px] text-white/70">Book customer order request for Admin processing</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {formError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* Customer Selection */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-ink flex items-center justify-between">
              <span>Customer *</span>
              {selectedCustomer && (
                <span className="text-[10px] text-primary font-semibold">Selected</span>
              )}
            </label>

            {selectedCustomer ? (
              <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-lavender-50/50 p-2.5">
                <div>
                  <div className="text-xs font-bold text-ink">{selectedCustomer.ledger_name}</div>
                  <div className="text-[11px] text-ink-muted flex items-center gap-2">
                    {selectedCustomer.phone && <span>📞 {selectedCustomer.phone}</span>}
                    {selectedCustomer.credit_limit && (
                      <span>Limit: ₹{selectedCustomer.credit_limit}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerId('');
                    setCustomerSearch('');
                    setShowCustomerDropdown(true);
                  }}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  placeholder="Search customer by name or phone..."
                  value={customerSearch}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  className="w-full rounded-xl border border-border-soft bg-page pl-9 pr-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:bg-white focus:border-primary focus:outline-none"
                />

                {showCustomerDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-xl border border-border-soft bg-white p-1 shadow-lg z-30">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-3 text-center text-xs text-ink-muted">No customers found</div>
                    ) : (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCustomerId(c.id);
                            setShowCustomerDropdown(false);
                          }}
                          className="w-full flex flex-col text-left rounded-lg p-2 hover:bg-lavender-50 transition-colors"
                        >
                          <span className="text-xs font-bold text-ink">{c.ledger_name}</span>
                          <span className="text-[10px] text-ink-muted">{c.phone || 'No phone'}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Booking Source */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-ink block mb-1">Order Source</label>
              <select
                value={bookingSource}
                onChange={(e) => setBookingSource(e.target.value)}
                className="w-full rounded-xl border border-border-soft bg-white p-2 text-xs text-ink focus:border-primary focus:outline-none"
              >
                <option value="salesman">Salesman (Field Visit)</option>
                <option value="phone">Phone Call</option>
                <option value="whatsapp">WhatsApp Order</option>
                <option value="direct">Direct Customer Request</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-ink block mb-1">Booked By</label>
              <div className="rounded-xl border border-border-soft bg-page p-2 text-xs text-ink font-semibold truncate">
                {user?.name || 'Field Sales Executive'}
              </div>
            </div>
          </div>

          {/* Product Lines Editor (Without warehouse stock indicators) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-ink">Requested Products *</label>
              <span className="text-[11px] text-ink-muted">{validLines.length} item(s)</span>
            </div>

            <div className="space-y-2">
              {lines.map((line, idx) => {
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-border-soft bg-page p-2.5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={line.item_id}
                        onChange={(e) => {
                          const picked = items.find((i) => i.id === Number(e.target.value));
                          updateLine(idx, {
                            item_id: e.target.value,
                            rate: picked ? picked.retail_price || 0 : line.rate,
                          });
                        }}
                        className="flex-1 rounded-lg border border-border-soft bg-white px-2.5 py-1.5 text-xs text-ink font-medium focus:border-primary focus:outline-none"
                      >
                        <option value="">-- Choose Product --</option>
                        {items.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.item_name} ({i.item_code})
                          </option>
                        ))}
                      </select>

                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                          title="Remove Line"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    {/* Qty, Rate & Line Total */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <div>
                        <label className="text-[10px] font-semibold text-ink-muted block">Quantity</label>
                        <input
                          type="number"
                          step="any"
                          min="0.1"
                          placeholder="Qty"
                          value={line.qty}
                          onChange={(e) => updateLine(idx, { qty: e.target.value })}
                          className="w-full rounded-lg border border-border-soft bg-white px-2 py-1 text-xs text-ink font-bold focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-ink-muted block">Rate (₹)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="Rate"
                          value={line.rate}
                          onChange={(e) => updateLine(idx, { rate: e.target.value })}
                          className="w-full rounded-lg border border-border-soft bg-white px-2 py-1 text-xs text-ink font-bold focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div className="text-right">
                        <label className="text-[10px] font-semibold text-ink-muted block">Line Total</label>
                        <span className="text-xs font-extrabold text-ink">
                          ₹{(Number(line.qty || 0) * Number(line.rate || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline py-1"
            >
              <Plus size={14} />
              <span>+ Add Another Product</span>
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-ink block mb-1">Delivery Notes / Instructions</label>
            <textarea
              rows={2}
              placeholder="e.g. Deliver to counter, morning shipment requested..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-border-soft bg-white p-2.5 text-xs text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* Estimated Total Display */}
          <div className="rounded-2xl bg-[#EDE8FF] p-3 border border-[#DDD0FF] flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#511E69]">Estimated Order Total</span>
            <span className="text-base font-extrabold text-[#351442]">₹{estimatedTotal.toFixed(2)}</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createMutation.isPending}
              disabled={!customerId || validLines.length === 0}
              className="flex-1 py-2.5 rounded-xl font-bold"
            >
              Submit Order
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Mobile-First Van Stock Viewer Modal
 */
function MobileVanStockModal({ onClose }) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const vanQuery = useQuery({
    queryKey: ['van-pending', user?.id],
    queryFn: () => vanStockApi.pending(user?.id),
    enabled: !!user?.id,
  });

  const items = vanQuery.data || [];
  const filtered = items.filter((i) => {
    const q = search.toLowerCase();
    return (
      (i.item_name || '').toLowerCase().includes(q) ||
      (i.item_code || '').toLowerCase().includes(q)
    );
  });

  const totalQty = items.reduce((sum, i) => sum + Number(i.quantity_on_hand || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-lg max-h-[85vh] rounded-t-3xl sm:rounded-3xl bg-white flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between border-b border-border-soft px-4 py-3 bg-[#351442] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Truck size={17} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">My Van Stock</h2>
              <p className="text-[10px] text-white/70">Salesman: {user?.name || 'Field Sales Executive'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-white/80 hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        {/* Summary info & Search */}
        <div className="p-3 border-b border-border-soft bg-page space-y-2 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-ink-muted">Total Distinct Items: <strong className="text-ink">{items.length}</strong></span>
            <span className="font-semibold text-ink-muted">Total On-hand Units: <strong className="text-primary">{totalQty}</strong></span>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Search items in your van..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border-soft bg-white pl-9 pr-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {vanQuery.isLoading ? (
            <div className="p-8 text-center text-xs text-ink-muted">Loading your van stock...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-muted">
              {search ? 'No matching items in your van' : 'No active stock currently assigned to your van'}
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.item_id}
                className="flex items-center justify-between rounded-xl border border-border-soft bg-white p-3 shadow-xs"
              >
                <div>
                  <div className="text-xs font-bold text-ink">{item.item_name}</div>
                  <div className="text-[10px] text-ink-muted mt-0.5">
                    SKU: {item.item_code || '-'} · Unit: {item.unit_code || '-'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-extrabold text-emerald-700">
                    {item.quantity_on_hand} {item.unit_code}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border-soft p-3 bg-page flex items-center justify-between shrink-0">
          <Link
            to="/inventory"
            onClick={onClose}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>Stock Operations & Movement History</span>
            <ChevronRight size={13} />
          </Link>
          <Button variant="secondary" size="sm" onClick={onClose} className="rounded-xl px-4 text-xs font-bold">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Mobile-First Customer Creation Dialog
 */
function MobileCustomerCreateModal({ onClose }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('0');
  const [pricingType, setPricingType] = useState('normal');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const createMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setSuccess('Customer created successfully!');
      setTimeout(() => {
        onClose();
      }, 1200);
    },
    onError: (err) => {
      setError(err?.response?.data?.error || 'Failed to create customer');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Customer name is required');
    if (!phone.trim()) return setError('Phone number is required');

    createMutation.mutate({
      ledger_name: name.trim(),
      phone: phone.trim(),
      address: address.trim() || null,
      credit_limit: creditLimit ? Number(creditLimit) : 0,
      pricing_type: pricingType,
      is_local_customer: 1,
      status: 'active',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between border-b border-border-soft px-4 py-3 bg-[#351442] text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#8244AD] text-white">
              <Users size={17} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">Create New Customer</h2>
              <p className="text-[10px] text-white/70">Register store or retail customer</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-white/80 hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              <span className="font-semibold">{success}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-ink block mb-1">Customer / Store Name *</label>
            <input
              type="text"
              placeholder="e.g. Sri Murugan Store"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border-soft bg-white p-2 text-xs text-ink focus:border-primary focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-ink block mb-1">Phone Number *</label>
              <input
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-border-soft bg-white p-2 text-xs text-ink focus:border-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-ink block mb-1">Credit Limit (₹)</label>
              <input
                type="number"
                placeholder="0"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full rounded-xl border border-border-soft bg-white p-2 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-ink block mb-1">Pricing Category</label>
            <select
              value={pricingType}
              onChange={(e) => setPricingType(e.target.value)}
              className="w-full rounded-xl border border-border-soft bg-white p-2 text-xs text-ink focus:border-primary focus:outline-none"
            >
              <option value="normal">Standard (Normal Rate)</option>
              <option value="wholesale">Wholesale Pricing</option>
              <option value="retail">Retail Pricing</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-ink block mb-1">Delivery Address</label>
            <textarea
              rows={2}
              placeholder="Store location or street address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-border-soft bg-white p-2 text-xs text-ink focus:border-primary focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border-soft">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1 rounded-xl text-xs font-bold">
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={createMutation.isPending} className="flex-1 rounded-xl text-xs font-bold">
              Save Customer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Main Field Sales Dashboard
 * Clean, user-friendly hub displaying all 8 core Field Sales Executive actions:
 * 1. Create Customer
 * 2. New Customer Order
 * 3. View Orders
 * 4. Manage Vans
 * 5. View Van Stock
 * 6. Issue Stock
 * 7. Record Stock Return
 * 8. View Stock History
 */
export function FieldSalesDashboard() {
  const { user } = useAuth();

  // Modal active states
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showVanStockModal, setShowVanStockModal] = useState(false);

  // Permission checks
  const canManageCustomers = usePermission('parties.manage_customers');
  const canCreateOrder = usePermission('orders.create_prebooking');
  const canViewOrders = usePermission([
    'orders.create_prebooking',
    'orders.view_prebooking',
    'orders.manage_prebooking_status',
  ]);
  const canManageVans = usePermission(['inventory.issue_van_stock', 'inventory.view_stock']);
  const canViewVanStock = usePermission(['inventory.view_stock', 'inventory.issue_van_stock']);
  const canIssueStock = usePermission('inventory.issue_van_stock');
  const canViewStockHistory = usePermission(['inventory.view_stock', 'inventory.issue_van_stock']);

  const hasAnyAction =
    canManageCustomers ||
    canCreateOrder ||
    canViewOrders ||
    canManageVans ||
    canViewVanStock ||
    canIssueStock ||
    canViewStockHistory;

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-10">
      {/* 1. Welcoming Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-[#DDD0FF] bg-gradient-to-br from-[#EDE8FF] via-[#F4F0FF] to-[#FAF8FF] p-5 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/90 border border-[#DDD0FF] px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#6F2DA8] shadow-2xs">
              <ShieldCheck size={12} />
              <span>Field Sales Executive Portal</span>
            </div>
            <h1 className="mt-1.5 text-xl sm:text-2xl font-black tracking-tight text-[#17233D] flex items-center gap-2">
              <span>Welcome, {user?.name || 'Sales Officer'}</span>
              <span className="animate-wiggle">👋</span>
            </h1>
            <p className="mt-0.5 text-xs text-[#697797] font-medium">
              Create customer orders, manage field customer accounts, inspect van stock, and track distribution movements.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Primary 8 Actions Grid */}
      <div>
        <div className="text-xs font-extrabold uppercase tracking-wider text-ink-muted mb-2.5 px-1">
          Quick Operations &amp; Actions
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Action 1: Create Customer */}
          {canManageCustomers && (
            <button
              type="button"
              onClick={() => setShowCreateCustomerModal(true)}
              className="group rounded-2xl border border-border-soft bg-white p-4 shadow-2xs hover:border-[#8244AD]/40 hover:shadow-soft transition-all text-left flex flex-col justify-between min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[#8244AD]"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-[#8244AD] group-hover:scale-105 transition-transform">
                  <Users size={20} />
                </div>
                <Plus size={15} className="text-[#8244AD]" />
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-ink group-hover:text-primary transition-colors">
                  Create Customer
                </h3>
                <p className="text-[11px] text-ink-muted leading-tight mt-0.5">
                  Register a new retail or wholesale store
                </p>
              </div>
            </button>
          )}

          {/* Action 2: New Customer Order */}
          {canCreateOrder && (
            <button
              type="button"
              onClick={() => setShowOrderModal(true)}
              className="group rounded-2xl border border-[#DDD0FF] bg-gradient-to-br from-white to-[#F9F6FF] p-4 shadow-2xs hover:border-[#8244AD] hover:shadow-soft transition-all text-left flex flex-col justify-between min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[#8244AD]"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDE5FF] text-[#6F2DA8] group-hover:scale-105 transition-transform">
                  <ClipboardList size={20} />
                </div>
                <span className="rounded-full bg-[#EDE8FF] px-2 py-0.5 text-[9.5px] font-bold text-[#6F2DA8]">
                  New
                </span>
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-ink group-hover:text-[#6F2DA8] transition-colors">
                  New Customer Order
                </h3>
                <p className="text-[11px] text-ink-muted leading-tight mt-0.5">
                  Book pre-booking order for store delivery
                </p>
              </div>
            </button>
          )}

          {/* Action 3: View Orders */}
          {canViewOrders && (
            <Link
              to="/orders"
              className="group rounded-2xl border border-border-soft bg-white p-4 shadow-2xs hover:border-indigo-300 hover:shadow-soft transition-all text-left flex flex-col justify-between min-h-[120px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform">
                  <FileText size={20} />
                </div>
                <ChevronRight size={15} className="text-ink-muted group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-ink group-hover:text-indigo-600 transition-colors">
                  View Orders
                </h3>
                <p className="text-[11px] text-ink-muted leading-tight mt-0.5">
                  Pre-booking orders &amp; fulfilment register
                </p>
              </div>
            </Link>
          )}

          {/* Action 4: Manage Vans */}
          {canManageVans && (
            <Link
              to="/vans"
              className="group rounded-2xl border border-border-soft bg-white p-4 shadow-2xs hover:border-amber-300 hover:shadow-soft transition-all text-left flex flex-col justify-between min-h-[120px] focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
                  <Truck size={20} />
                </div>
                <ChevronRight size={15} className="text-ink-muted group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-ink group-hover:text-amber-600 transition-colors">
                  Manage Vans
                </h3>
                <p className="text-[11px] text-ink-muted leading-tight mt-0.5">
                  Distribution fleet, assigned staff &amp; status
                </p>
              </div>
            </Link>
          )}

          {/* Action 5: View Van Stock */}
          {canViewVanStock && (
            <div
              tabIndex={0}
              role="button"
              onClick={() => setShowVanStockModal(true)}
              className="group cursor-pointer rounded-2xl border border-border-soft bg-white p-4 shadow-2xs hover:border-blue-300 hover:shadow-soft transition-all text-left flex flex-col justify-between min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
                  <Package size={20} />
                </div>
                <ChevronRight size={15} className="text-ink-muted group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-ink group-hover:text-blue-600 transition-colors">
                  View Van Stock
                </h3>
                <p className="text-[11px] text-ink-muted leading-tight mt-0.5">
                  Live quantities on-hand inside your van
                </p>
              </div>
            </div>
          )}

          {/* Action 6: Issue Stock */}
          {canIssueStock && (
            <Link
              to="/van-stock?tab=issue"
              className="group rounded-2xl border border-border-soft bg-white p-4 shadow-2xs hover:border-emerald-300 hover:shadow-soft transition-all text-left flex flex-col justify-between min-h-[120px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
                  <ArrowDownLeft size={20} />
                </div>
                <ChevronRight size={15} className="text-ink-muted group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-ink group-hover:text-emerald-600 transition-colors">
                  Issue Stock
                </h3>
                <p className="text-[11px] text-ink-muted leading-tight mt-0.5">
                  Transfer branch inventory out to mobile van
                </p>
              </div>
            </Link>
          )}

          {/* Action 7: Record Stock Return */}
          {canIssueStock && (
            <Link
              to="/van-stock?tab=return"
              className="group rounded-2xl border border-border-soft bg-white p-4 shadow-2xs hover:border-rose-300 hover:shadow-soft transition-all text-left flex flex-col justify-between min-h-[120px] focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 group-hover:scale-105 transition-transform">
                  <RotateCcw size={20} />
                </div>
                <ChevronRight size={15} className="text-ink-muted group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-ink group-hover:text-rose-600 transition-colors">
                  Record Stock Return
                </h3>
                <p className="text-[11px] text-ink-muted leading-tight mt-0.5">
                  Process day-end unsold items return
                </p>
              </div>
            </Link>
          )}

          {/* Action 8: View Stock History */}
          {canViewStockHistory && (
            <Link
              to="/stock-history"
              className="group rounded-2xl border border-border-soft bg-white p-4 shadow-2xs hover:border-[#8244AD]/40 hover:shadow-soft transition-all text-left flex flex-col justify-between min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[#8244AD]"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-[#8244AD] group-hover:scale-105 transition-transform">
                  <History size={20} />
                </div>
                <ChevronRight size={15} className="text-ink-muted group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-bold text-ink group-hover:text-primary transition-colors">
                  View Stock History
                </h3>
                <p className="text-[11px] text-ink-muted leading-tight mt-0.5">
                  Stock issues, returns &amp; movement audit log
                </p>
              </div>
            </Link>
          )}

          {!hasAnyAction && (
            <div className="col-span-full py-10 text-center rounded-2xl border border-dashed border-border-soft bg-white/60 p-6">
              <ShieldCheck className="mx-auto h-8 w-8 text-ink-muted/50 mb-2" />
              <p className="text-xs font-semibold text-ink-muted">No operations are currently assigned to your account. Please contact an administrator.</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. MODALS */}

      {/* Customer Creation Modal */}
      {showCreateCustomerModal && (
        <MobileCustomerCreateModal onClose={() => setShowCreateCustomerModal(false)} />
      )}

      {/* Order Creation Modal */}
      {showOrderModal && (
        <MobileCustomerOrderModal onClose={() => setShowOrderModal(false)} />
      )}

      {/* Van Stock Modal */}
      {showVanStockModal && (
        <MobileVanStockModal onClose={() => setShowVanStockModal(false)} />
      )}
    </div>
  );
}

