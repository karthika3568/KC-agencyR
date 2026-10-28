import { useState, useEffect, Fragment } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, Search, Plus, Trash2, CheckCircle2, AlertTriangle, Truck, SlidersHorizontal, X, FileSpreadsheet, FileDown, Printer, ChevronDown, ChevronRight, ShoppingCart } from 'lucide-react';
import { itemsApi } from '../api/catalog';
import { usersApi } from '../api/users';
import { stockAdjustmentsApi, stockHubApi, vanStockApi, vanStockIssuesApi } from '../api/purchasing';
import { Tabs } from '../components/Tabs';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePermission } from '../hooks/usePermission';
import { Button } from '../components/Button.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { downloadReportPdf, downloadVanIssuePdf } from '../utils/reportPdf';
import { Pagination } from '../components/Pagination';
import { useClientPagination } from '../hooks/useClientPagination';
import { PrintPreviewModal } from '../components/PrintPreviewModal';
import { handleFormKeyDown } from '../utils/formNavigation';

export function StockHubPanel() {
  const [ownerType, setOwnerType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const stockQuery = useQuery({
    queryKey: ['stock-hub', ownerType],
    queryFn: () => stockHubApi.list(ownerType ? { owner_type: ownerType } : {}),
  });
  const lowStockQuery = useQuery({ queryKey: ['stock-hub-low'], queryFn: stockHubApi.lowStock });

  const rows = stockQuery.data || [];
  const low = lowStockQuery.data || [];

  const filteredRows = rows.filter((r) => {
    return (
      r.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.item_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.owner_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const {
    page,
    setPage,
    total,
    paginatedItems: pagedRows,
    resetPage,
  } = useClientPagination(filteredRows, 10);

  const [exportError, setExportError] = useState('');
  const [exportingExcel, setExportingExcel] = useState(false);

  // Excel export goes server-side with the same owner_type filter (a fresh,
  // authoritative re-fetch); PDF is built client-side from filteredRows so
  // it also honors the live search box, which the server-side export can't
  // see. Both only ever include what's currently in view, never a full dump.
  const handleExportExcel = async () => {
    setExportError('');
    setExportingExcel(true);
    try {
      await stockHubApi.downloadExport(ownerType ? { owner_type: ownerType } : {});
    } catch (err) {
      setExportError(err?.response?.data?.error || err?.message || 'Unable to generate the Excel file. Please try again.');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPdf = () => {
    setExportError('');
    try {
      downloadReportPdf({
        title: 'Van / Salesman Stock',
        filtersText: ownerType ? `Owner type: ${ownerType}${searchQuery ? ` · Search: "${searchQuery}"` : ''}` : (searchQuery ? `Search: "${searchQuery}"` : 'All locations/owners'),
        columns: {
          item_name: 'Item', item_code: 'SKU', barcode: 'Barcode', unit_code: 'Unit', quantity_on_hand: 'Quantity',
          cost_price: 'Cost Price', selling_price: 'Selling Price', stock_value: 'Stock Value',
          owner_name: 'Van/Salesman', branch_name: 'Branch',
        },
        rows: filteredRows,
        filename: `van_salesman_stock_${new Date().toISOString().slice(0, 10)}.pdf`,
      });
    } catch (err) {
      setExportError(err?.message || 'Unable to generate the PDF. Please try again.');
    }
  };

  return (
    <div className="space-y-2.5">
      {low.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs p-2.5 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold text-amber-300">{low.length} Item(s) At or Below Minimum Stock:</strong>
            <p className="text-amber-400/80 mt-0.5">{low.map((i) => `${i.item_name} (${i.item_code})`).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
        {/* Left Column Controls */}
        <div className="lg:col-span-4">
          <div className="card p-3.5 space-y-2.5 lg:sticky lg:top-3">
            <div className="border-b border-border-soft pb-2">
              <h2 className="font-semibold text-ink text-sm sm:text-base flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                Filter Stock Hub
              </h2>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-ink-muted block mb-0.5">Owner Location Type</label>
                <select
                  value={ownerType}
                  onChange={(e) => setOwnerType(e.target.value)}
                  className="input w-full"
                >
                  <option value="">All Locations / Owners</option>
                  <option value="branch">Main Branch / Floor</option>
                  <option value="employee">Salesman Van Stock</option>
                </select>
              </div>

              <div className="p-2.5 rounded-lg bg-surface-subtle/30 border border-border-soft/60 space-y-1 text-xs">
                <div className="text-ink-muted">Total Distinct Records: <strong className="text-ink">{rows.length}</strong></div>
                <div className="text-ink-muted">Low Stock Threshold Alerts: <strong className="text-amber-400">{low.length}</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column Table */}
        <div className="lg:col-span-8 space-y-2.5">
          <div className="card p-2.5 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Search stock by item or owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-8 w-full text-xs"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-ink-muted">{filteredRows.length} item(s) in view</span>
              <button onClick={handleExportExcel} disabled={exportingExcel} className="flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-60">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {exportingExcel ? 'Exporting…' : 'Export Excel'}
              </button>
              <button onClick={handleExportPdf} disabled={filteredRows.length === 0} className="flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-60">
                <FileDown className="h-3.5 w-3.5" />
                Export PDF
              </button>
            </div>
          </div>
          {exportError && <div className="text-xs text-red-400 bg-red-950/40 p-2 rounded border border-red-800/40">{exportError}</div>}

          <div className="card overflow-hidden">
            <div className="px-3.5 py-2 border-b border-border-soft flex items-center justify-between">
              <h3 className="font-semibold text-ink text-xs sm:text-sm">Real-time Stock Inventory</h3>
            </div>
            <div className="max-h-[calc(100vh-230px)] overflow-x-auto overflow-y-auto">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead className="sticky top-0 bg-page z-10">
                  <tr className="border-b border-border-soft uppercase text-ink-muted font-medium">
                    <th className="px-3 py-1.5">Item Details</th>
                    <th className="px-3 py-1.5">Owner Type</th>
                    <th className="px-3 py-1.5">Location / Owner</th>
                    <th className="px-3 py-1.5">On Hand Qty</th>
                    <th className="px-3 py-1.5">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft/60">
                  {pagedRows.map((r) => {
                    const isQtyLow = Number(r.quantity_on_hand) <= 0;
                    return (
                      <tr key={r.id} className="hover:bg-page/50 transition">
                        <td className="px-3 py-1.5 font-medium text-ink">
                          {r.item_name}
                          <span className="text-ink-muted text-[10px] ml-1.5 font-mono">({r.item_code})</span>
                        </td>
                        <td className="px-3 py-1.5 capitalize text-ink-muted">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                            {r.owner_type}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-ink font-medium">{r.owner_name}</td>
                        <td className="px-3 py-1.5 font-semibold">
                          {isQtyLow ? (
                            <span className="text-red-400">{r.quantity_on_hand}</span>
                          ) : (
                            <span className="text-emerald-400">{r.quantity_on_hand}</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-ink-muted">{r.unit_code}</td>
                      </tr>
                    );
                  })}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-ink-muted text-xs">
                        No stock records matching search filters.
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

export function StockAdjustmentPanel({ canManage }) {
  const queryClient = useQueryClient();
  const [itemId, setItemId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('deduction');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('damage');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list('') });
  const adjustmentsQuery = useQuery({ queryKey: ['stock-adjustments'], queryFn: stockAdjustmentsApi.list });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
    queryClient.invalidateQueries({ queryKey: ['stock-hub'] });
    queryClient.invalidateQueries({ queryKey: ['items'] });
  };

  const createMutation = useMutation({
    mutationFn: stockAdjustmentsApi.create,
    onSuccess: () => {
      invalidate();
      resetForm();
      showSuccess('Stock adjustment logged successfully!');
    },
    onError: (err) => {
      setFormError(err?.response?.data?.error || 'Unable to save this stock adjustment. Please try again.');
    },
  });

  const resetForm = () => {
    setItemId('');
    setAdjustmentType('deduction');
    setQty('');
    setReason('damage');
    setRemarks('');
    setFormError('');
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!itemId) {
      setFormError('Please select an item.');
      return;
    }
    if (!qty || Number(qty) <= 0) {
      setFormError('Please enter a valid quantity.');
      return;
    }

    setFormError('');
    createMutation.mutate({
      item_id: Number(itemId),
      adjustment_type: adjustmentType,
      qty: Number(qty),
      reason,
      remarks: remarks || null,
    });
  };

  const items = itemsQuery.data || [];
  const adjustments = adjustmentsQuery.data || [];

  const filteredAdjustments = adjustments.filter((a) => {
    return (
      a.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.created_by_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const {
    page,
    setPage,
    total,
    paginatedItems: pagedAdjustments,
    resetPage,
  } = useClientPagination(filteredAdjustments, 10);

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
        <div className="lg:col-span-4">
          <div className="card p-3.5 space-y-2.5 lg:sticky lg:top-3">
            <div className="border-b border-border-soft pb-2">
              <h2 className="font-semibold text-ink text-sm sm:text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                New Stock Adjustment
              </h2>
            </div>

            <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-2">
              {formError && <div className="text-xs text-red-400 bg-red-950/40 p-2 rounded border border-red-800/40">{formError}</div>}

              <div>
                <label className="text-xs font-medium text-ink-muted block mb-0.5">Select Item *</label>
                <select
                  required
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  className="input w-full"
                >
                  <option value="">-- Select Item --</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.item_name} ({i.item_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-ink-muted block mb-0.5">Type *</label>
                  <select
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value)}
                    className="input w-full capitalize"
                  >
                    <option value="addition">Addition (+)</option>
                    <option value="deduction">Deduction (-)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-muted block mb-0.5">Qty *</label>
                  <input
                    required
                    type="number"
                    step="any"
                    min="0.01"
                    placeholder="1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-ink-muted block mb-0.5">Reason *</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input w-full capitalize"
                >
                  <option value="damage">Damage</option>
                  <option value="spoilage">Spoilage</option>
                  <option value="count_correction">Count Correction</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-ink-muted block mb-0.5">Remarks / Note</label>
                <textarea
                  rows="1"
                  placeholder="Additional explanation..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="input w-full"
                />
              </div>

              {canManage && (
                <div className="pt-1">
                  <Button type="submit" variant="primary" loading={createMutation.isPending} className="w-full">
                    Save Stock Adjustment
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column Table */}
        <div className="lg:col-span-8 space-y-2.5">
          <div className="card p-2.5 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Search adjustments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-8 w-full text-xs"
              />
            </div>
            <span className="text-xs text-ink-muted">{filteredAdjustments.length} adjustment record(s)</span>
          </div>

          <div className="card overflow-hidden">
            <div className="px-3.5 py-2 border-b border-border-soft flex items-center justify-between">
              <h3 className="font-semibold text-ink text-xs sm:text-sm">Stock Adjustment History</h3>
            </div>
            <div className="max-h-[calc(100vh-230px)] overflow-x-auto overflow-y-auto">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead className="sticky top-0 bg-page z-10">
                  <tr className="border-b border-border-soft uppercase text-ink-muted font-medium">
                    <th className="px-3 py-1.5">Item</th>
                    <th className="px-3 py-1.5">Type</th>
                    <th className="px-3 py-1.5">Qty</th>
                    <th className="px-3 py-1.5">Reason</th>
                    <th className="px-3 py-1.5">By</th>
                    <th className="px-3 py-1.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft/60">
                  {pagedAdjustments.map((a) => (
                    <tr key={a.id} className="hover:bg-page/50 transition">
                      <td className="px-3 py-1.5 font-medium text-ink">{a.item_name}</td>
                      <td className="px-3 py-1.5 capitalize">
                        {a.adjustment_type === 'addition' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Addition
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-300 border border-red-500/30">
                            Deduction
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 font-semibold text-ink">{a.qty}</td>
                      <td className="px-3 py-1.5 text-ink-muted capitalize">{a.reason?.replace('_', ' ')}</td>
                      <td className="px-3 py-1.5 text-ink-muted">{a.created_by_name}</td>
                      <td className="px-3 py-1.5 text-ink-muted">{a.created_at}</td>
                    </tr>
                  ))}
                  {filteredAdjustments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-ink-muted text-xs">
                        No adjustment records logged yet.
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

export function VanStockPanel({ canManage }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSalesman = user?.role === 'Field Sales Executive';
  const [employeeId, setEmployeeId] = useState(() => (isSalesman ? (user?.id ? String(user.id) : '') : (canManage ? '' : (user?.id ? String(user.id) : ''))));
  const [mode, setMode] = useState(() => (isSalesman ? 'return' : 'issue'));
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ item_id: '', qty: 1 }]);
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [shortageWarning, setShortageWarning] = useState(null);

  useEffect(() => {
    if (isSalesman && user?.id) {
      if (String(employeeId) !== String(user.id)) setEmployeeId(String(user.id));
      if (mode !== 'return') setMode('return');
    } else if (!canManage && user?.id && String(employeeId) !== String(user.id)) {
      setEmployeeId(String(user.id));
    }
  }, [isSalesman, canManage, user?.id, employeeId, mode]);

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: usersApi.list, enabled: canManage });
  const itemsQuery = useQuery({ queryKey: ['items', ''], queryFn: () => itemsApi.list('') });
  const pendingQuery = useQuery({
    queryKey: ['van-pending', employeeId],
    queryFn: () => vanStockApi.pending(employeeId),
    enabled: !!employeeId,
  });
  const issuesQuery = useQuery({
    queryKey: ['van-issues', employeeId],
    queryFn: () => vanStockIssuesApi.list(employeeId || undefined),
    enabled: !!employeeId || canManage,
  });
  const eligibleOrdersQuery = useQuery({
    queryKey: ['eligible-orders'],
    queryFn: () => vanStockApi.eligibleOrders('customer'),
    enabled: canManage && mode === 'issue',
  });

  const eligibleOrders = eligibleOrdersQuery.data || [];
  const selectedOrder = eligibleOrders.find((o) => String(o.id) === String(selectedOrderId));

  const handleSelectOrder = (orderIdStr) => {
    setSelectedOrderId(orderIdStr);
    if (!orderIdStr) {
      return;
    }
    const order = eligibleOrders.find((o) => String(o.id) === String(orderIdStr));
    if (order) {
      if (order.employee_id) {
        setEmployeeId(String(order.employee_id));
      }
      if (order.items && order.items.length > 0) {
        setLines(
          order.items.map((it) => ({
            item_id: String(it.item_id),
            qty: Number(it.qty),
            fromOrder: true,
          }))
        );
      }
      setNotes(`Order ${order.prebooking_no} for ${order.customer_name}`);
    }
  };

  const handleClearOrder = () => {
    setSelectedOrderId('');
    setLines([{ item_id: '', qty: 1 }]);
    setNotes('');
  };

  const mutation = useMutation({
    mutationFn: (payload) => (mode === 'issue' ? vanStockApi.issue(payload) : vanStockApi.returnStock(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['van-pending', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['van-issues'] });
      queryClient.invalidateQueries({ queryKey: ['eligible-orders'] });
      queryClient.invalidateQueries({ queryKey: ['customer-prebookings'] });
      queryClient.invalidateQueries({ queryKey: ['stock-hub'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setLines([{ item_id: '', qty: 1 }]);
      setSelectedOrderId('');
      setNotes('');
      setMessage(mode === 'issue' ? 'Stock issued to salesman successfully!' : 'Van stock return recorded.');
      setTimeout(() => setMessage(''), 3000);
    },
  });

  const updateLine = (idx, patch) => setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, { item_id: '', qty: 1 }]);
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const submitPayload = async (payload) => {
    try {
      await mutation.mutateAsync(payload);
      setShortageWarning(null);
    } catch (err) {
      // A stock-insufficiency warning (Issue Stock to Van only) comes back
      // as 409 with a `shortages` list — not a hard error. Surface it as a
      // Continue/Cancel confirmation instead of a dead-end error message;
      // any other failure (validation, server error) still just shows the
      // inline error banner.
      if (mode === 'issue' && err?.response?.status === 409 && err?.response?.data?.warning === 'insufficient_stock') {
        setShortageWarning({ payload, shortages: err.response.data.shortages });
        return;
      }
      setFormError(err?.response?.data?.error || 'Failed to process van stock');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setShortageWarning(null);
    if (!employeeId) {
      setFormError('Please select a salesman.');
      return;
    }
    const validLines = lines.filter((l) => l.item_id);
    if (validLines.length === 0) {
      setFormError('Please add at least one item line.');
      return;
    }

    const payload = {
      employee_id: Number(employeeId),
      items: validLines.map((l) => ({ item_id: Number(l.item_id), qty: Number(l.qty) })),
    };
    if (notes) payload.notes = notes;
    if (mode === 'issue' && selectedOrderId) {
      const ord = eligibleOrders.find((o) => String(o.id) === String(selectedOrderId));
      if (ord) {
        payload.prebooking_id = Number(ord.id);
        payload.customer_id = Number(ord.customer_id);
      }
    }

    await submitPayload(payload);
  };

  const confirmShortageAndIssue = async () => {
    if (!shortageWarning) return;
    await submitPayload({ ...shortageWarning.payload, confirm_insufficient: true });
  };

  const users = usersQuery.data || [];
  const items = itemsQuery.data || [];
  const pending = pendingQuery.data || [];
  const issues = issuesQuery.data || [];
  const selectedEmployee = canManage
    ? users.find((u) => String(u.id) === String(employeeId))
    : user;

  const {
    page: pendingPage,
    setPage: setPendingPage,
    total: pendingTotal,
    paginatedItems: pagedPending,
  } = useClientPagination(pending, 10);

  const {
    page: issuesPage,
    setPage: setIssuesPage,
    total: issuesTotal,
    paginatedItems: pagedIssues,
  } = useClientPagination(issues, 10);

  const handleSelectEmployee = (value) => {
    setEmployeeId(value);
    setSelectedItemIds([]); // never carry a selection across salesmen (section 8)
  };

  const toggleSelectItem = (itemId) => setSelectedItemIds((prev) => (
    prev.includes(itemId) ? prev.filter((x) => x !== itemId) : [...prev, itemId]
  ));
  const toggleSelectAll = () => setSelectedItemIds((prev) => (
    prev.length === pending.length ? [] : pending.map((p) => p.item_id)
  ));

  const handleExportExcel = async () => {
    setExportError('');
    setExporting(true);
    try {
      await vanStockApi.downloadExport(employeeId, selectedItemIds);
    } catch (err) {
      setExportError(err?.response?.data?.error || err?.message || 'Unable to generate the Excel file. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportSelectedExcel = async () => {
    if (selectedItemIds.length === 0) {
      setExportError('Please select at least one record to export.');
      return;
    }
    await handleExportExcel();
  };

  const vanStockPdfRows = () => (selectedItemIds.length > 0 ? pending.filter((p) => selectedItemIds.includes(p.item_id)) : pending);

  const handleExportPdf = () => {
    setExportError('');
    if (pending.length === 0) {
      setExportError('No van stock data to export for this salesman.');
      return;
    }
    try {
      downloadReportPdf({
        title: 'Van / Salesman Stock Report',
        filtersText: `Salesman: ${selectedEmployee?.name || employeeId}${selectedItemIds.length > 0 ? ` · ${selectedItemIds.length} row(s) selected` : ''}`,
        columns: {
          item_name: 'Item', item_code: 'SKU', barcode: 'Barcode', unit_code: 'Unit',
          quantity_on_hand: 'On-hand Qty', cost_price: 'Cost Price', selling_price: 'Selling Price', stock_value: 'Stock Value',
        },
        rows: vanStockPdfRows(),
        filename: `Van_Stock_${(selectedEmployee?.name || employeeId).replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`,
      });
    } catch (err) {
      setExportError(err?.message || 'Unable to generate the PDF. Please try again.');
    }
  };

  const handlePrint = () => {
    setExportError('');
    const rows = vanStockPdfRows();
    if (rows.length === 0) {
      setExportError('No van stock data to print for this salesman.');
      return;
    }
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) {
      setExportError('Could not open the print window — check your browser\'s popup blocker.');
      return;
    }
    const tableRows = rows.map((r) => `
      <tr>
        <td>${r.item_name}</td><td>${r.item_code || '-'}</td><td>${r.unit_code || '-'}</td>
        <td style="text-align:right">${r.quantity_on_hand}</td>
      </tr>`).join('');
    win.document.write(`
      <html><head><title>Van Stock — ${selectedEmployee?.name || ''}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .meta { color: #555; font-size: 12px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 12px; text-align: left; }
        th { background: #f1f5f9; }
      </style></head>
      <body>
        <h1>SALESMAN VAN STOCK REPORT</h1>
        <div class="meta">Salesman: ${selectedEmployee?.name || employeeId}<br/>Date: ${new Date().toLocaleDateString()}</div>
        <table>
          <thead><tr><th>Item</th><th>SKU</th><th>Unit</th><th>Qty</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  // Issue TRANSACTIONS (section 19-21) — distinct from the item-balance
  // table above: exporting a selected transaction pulls every item line it
  // contains, never just one item of it.
  const [selectedIssueIds, setSelectedIssueIds] = useState([]);
  const [issueExportError, setIssueExportError] = useState('');
  const [issueExporting, setIssueExporting] = useState(false);
  const [printingIssue, setPrintingIssue] = useState(null);
  const [expandedIssueIds, setExpandedIssueIds] = useState([]);

  const toggleExpandIssue = (id) => {
    setExpandedIssueIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectIssue = (id) => setSelectedIssueIds((prev) => (
    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
  ));
  const toggleSelectAllIssues = () => setSelectedIssueIds((prev) => (
    prev.length === issues.length ? [] : issues.map((i) => i.id)
  ));

  const handleExportIssuesExcel = async () => {
    setIssueExportError('');
    setIssueExporting(true);
    try {
      await vanStockIssuesApi.downloadExport(selectedIssueIds.length > 0 ? selectedIssueIds : issues.map((i) => i.id));
    } catch (err) {
      setIssueExportError(err?.response?.data?.error || err?.message || 'Unable to generate the Excel file. Please try again.');
    } finally {
      setIssueExporting(false);
    }
  };

  const handleExportSelectedIssuesExcel = async () => {
    if (selectedIssueIds.length === 0) {
      setIssueExportError('Please select at least one issue transaction to export.');
      return;
    }
    await handleExportIssuesExcel();
  };

  const handleIssuesPdfOrPrint = async (print) => {
    setIssueExportError('');
    const ids = selectedIssueIds.length > 0 ? selectedIssueIds : issues.map((i) => i.id);
    if (ids.length === 0) {
      setIssueExportError('No issue transactions to export.');
      return;
    }
    setIssueExporting(true);
    try {
      const detailRows = await vanStockIssuesApi.detail(ids);
      if (detailRows.length === 0) {
        setIssueExportError('No issue transactions to export.');
        return;
      }
      const singleIssueNo = ids.length === 1 ? detailRows[0]?.issue_no : null;
      downloadVanIssuePdf(
        detailRows,
        singleIssueNo ? `${singleIssueNo}.pdf` : `Van_Stock_Issues_${new Date().toISOString().slice(0, 10)}.pdf`,
        { print }
      );
    } catch (err) {
      setIssueExportError(err?.response?.data?.error || err?.message || 'Unable to generate the PDF. Please try again.');
    } finally {
      setIssueExporting(false);
    }
  };

  return (
    <div className="space-y-2.5">
      {message && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {message}
        </div>
      )}

      <div className={`grid grid-cols-1 gap-3.5 ${canManage ? 'lg:grid-cols-12' : ''}`}>
        {/* Left Column Form */}
        {canManage && (
          <div className="lg:col-span-5">
            <div className="card p-3.5 space-y-2.5 lg:sticky lg:top-3">
              <div className="border-b border-border-soft pb-2 flex items-center justify-between">
                <h2 className="font-semibold text-ink text-sm sm:text-base flex items-center gap-2">
                  <Truck className="w-4 h-4 text-indigo-400" />
                  Van Stock Operations
                </h2>
                <div className="flex gap-1 bg-surface-subtle p-0.5 rounded-lg">
                  {!isSalesman && (
                    <button
                      type="button"
                      onClick={() => setMode('issue')}
                      className={`px-2 py-0.5 rounded text-xs font-semibold transition ${
                        mode === 'issue' ? 'bg-indigo-500 text-white' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      Issue Stock
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMode('return')}
                    className={`px-2 py-0.5 rounded text-xs font-semibold transition ${
                      mode === 'return' ? 'bg-indigo-500 text-white' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    Day-end Return
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-2">
                {formError && <div className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded border border-red-800/40">{formError}</div>}

                {mode === 'issue' && (
                  <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                        <ShoppingCart className="w-3.5 h-3.5 text-indigo-400" />
                        Link Customer Pre-Booking Order
                      </label>
                      {selectedOrderId && (
                        <button
                          type="button"
                          onClick={handleClearOrder}
                          className="text-[10px] text-red-400 hover:text-red-300 underline font-medium"
                        >
                          Clear Order Link
                        </button>
                      )}
                    </div>
                    <select
                      value={selectedOrderId}
                      onChange={(e) => handleSelectOrder(e.target.value)}
                      className="input w-full text-xs bg-surface border-indigo-500/40 text-ink"
                    >
                      <option value="">-- No Order Linked (General Van Stock Allocation) --</option>
                      {eligibleOrders.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.prebooking_no} — {o.customer_name} ({o.item_count} items · ₹{Number(o.estimated_total || 0).toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>

                    {selectedOrder && (
                      <div className="text-[11px] bg-surface/90 border border-indigo-500/30 rounded p-2 text-ink space-y-1">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="text-emerald-400 flex items-center gap-1">
                            <span className="text-ink-muted font-normal">Customer:</span> {selectedOrder.customer_name}
                          </span>
                          <span className="font-mono text-gold bg-gold/10 px-1.5 py-0.5 rounded text-[10px]">
                            {selectedOrder.prebooking_no}
                          </span>
                        </div>
                        {selectedOrder.customer_phone && (
                          <div className="text-[10.5px] text-ink-muted">Phone: {selectedOrder.customer_phone}</div>
                        )}
                        <div className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded">
                          ✓ {selectedOrder.items?.length || 0} order item(s) mapped automatically. You can adjust quantities or click <b>"+ Add Extra Item to Van"</b> below.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-ink-muted block mb-0.5">Salesman *</label>
                  {isSalesman ? (
                    <div className="input w-full bg-page/70 text-ink text-xs flex items-center justify-between cursor-not-allowed">
                      <span>{user?.name || 'Logged-in Salesman'}</span>
                      <span className="text-[10px] text-ink-muted">(You)</span>
                    </div>
                  ) : (
                    <select
                      required
                      value={employeeId}
                      onChange={(e) => handleSelectEmployee(e.target.value)}
                      className="input w-full"
                    >
                      <option value="">-- Select Salesman --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role_name})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-ink-muted block">Stock Lines *</label>
                    {selectedOrderId && (
                      <span className="text-[10.5px] text-indigo-400 font-medium">Order items + Extra items</span>
                    )}
                  </div>
                  {lines.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={line.item_id}
                        onChange={(e) => updateLine(idx, { item_id: e.target.value })}
                        className="input text-xs flex-1"
                      >
                        <option value="">Select Item</option>
                        {items.map((i) => {
                          const vanItem = mode === 'return' ? pending.find((p) => p.item_id === i.id) : null;
                          const suffix = mode === 'return'
                            ? (vanItem ? ` [In Van: ${vanItem.quantity_on_hand}]` : ' [In Van: 0]')
                            : (i.item_code ? ` (${i.item_code})` : '');
                          return (
                            <option key={i.id} value={i.id}>
                              {i.item_name}{suffix}
                            </option>
                          );
                        })}
                      </select>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        placeholder="Qty"
                        value={line.qty}
                        onChange={(e) => updateLine(idx, { qty: e.target.value })}
                        className="input text-xs w-20"
                      />
                      {line.fromOrder && (
                        <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1 py-0.5 rounded whitespace-nowrap">
                          Order
                        </span>
                      )}
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="p-1 text-red-400 hover:text-red-300 transition"
                          title="Remove item line"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addLine}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1 pt-0.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {selectedOrderId ? 'Add Extra Item to Van' : 'Add Another Item'}
                  </button>
                </div>

                <div>
                  <label className="text-xs font-medium text-ink-muted block mb-0.5">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Route / Delivery instructions"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input w-full text-xs"
                  />
                </div>

                <div className="pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={mutation.isPending}
                    disabled={!employeeId}
                    className="w-full"
                  >
                    {mode === 'issue'
                      ? (selectedOrderId ? 'Issue Stock & Dispatch Order' : 'Issue Stock to Salesman')
                      : 'Save Van Stock Return'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Right Column Table */}
        <div className={canManage ? 'lg:col-span-7 space-y-2.5' : 'space-y-2.5'}>
          <div className="card overflow-hidden">
            <div className="px-3.5 py-2 border-b border-border-soft flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-ink text-xs sm:text-sm">Salesman Active Van Stock</h3>
              <span className="text-xs text-ink-muted">
                {selectedEmployee ? `Salesman: ${selectedEmployee.name}` : (employeeId ? `Salesman ID: ${employeeId}` : 'Select salesman to view live balance')}
              </span>
            </div>
            {employeeId && (
              <div className="px-3.5 py-1.5 border-b border-border-soft flex flex-wrap items-center gap-1.5 bg-surface-subtle/20">
                <button onClick={handlePrint} className="rounded bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-colors">Print</button>
                <button onClick={handleExportPdf} className="rounded bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-colors">Download PDF</button>
                <button onClick={handleExportExcel} disabled={exporting} className="rounded bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-60">
                  {exporting ? 'Exporting…' : 'Export Excel'}
                </button>
                <button onClick={handleExportSelectedExcel} disabled={exporting} className="rounded bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-60">
                  Export Selected
                </button>
                {selectedItemIds.length > 0 && (
                  <span className="text-xs text-ink-muted">{selectedItemIds.length} selected</span>
                )}
              </div>
            )}
            {exportError && <div className="mx-3.5 mt-2 text-xs text-red-400 bg-red-950/40 p-2 rounded border border-red-800/40">{exportError}</div>}
            <div className="max-h-[calc(100vh-320px)] overflow-x-auto overflow-y-auto">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead className="sticky top-0 bg-page z-10">
                  <tr className="border-b border-border-soft uppercase text-ink-muted font-medium">
                    <th className="w-8 px-3 py-1.5">
                      {pending.length > 0 && (
                        <input type="checkbox" checked={selectedItemIds.length === pending.length} onChange={toggleSelectAll} />
                      )}
                    </th>
                    <th className="px-3 py-1.5">Item</th>
                    <th className="px-3 py-1.5">SKU</th>
                    <th className="px-3 py-1.5">Unit</th>
                    <th className="px-3 py-1.5">Salesman On-hand Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft/60">
                  {pagedPending.map((p) => (
                    <tr key={p.item_id} className="hover:bg-page/50 transition">
                      <td className="px-3 py-1.5">
                        <input type="checkbox" checked={selectedItemIds.includes(p.item_id)} onChange={() => toggleSelectItem(p.item_id)} />
                      </td>
                      <td className="px-3 py-1.5 font-medium text-ink">{p.item_name}</td>
                      <td className="px-3 py-1.5 text-ink-muted">{p.item_code || '-'}</td>
                      <td className="px-3 py-1.5 text-ink-muted">{p.unit_code || '-'}</td>
                      <td className="px-3 py-1.5 font-semibold text-emerald-400">{p.quantity_on_hand}</td>
                    </tr>
                  ))}
                  {(!employeeId || pending.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-ink-muted text-xs">
                        {employeeId ? 'No active van stock assigned to this salesman.' : (canManage ? 'Select a salesman on the left form.' : 'No van stock found.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={pendingPage} pageSize={10} total={pendingTotal} onPageChange={setPendingPage} />
          </div>

          <div className="card overflow-hidden">
            <div className="px-3.5 py-2 border-b border-border-soft flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-ink text-xs sm:text-sm">Issue Transactions</h3>
              <span className="text-xs text-ink-muted">
                {selectedEmployee ? `Salesman: ${selectedEmployee.name}` : (canManage ? 'All salesmen' : '')}
              </span>
            </div>
            <div className="px-3.5 py-1.5 border-b border-border-soft flex flex-wrap items-center gap-1.5 bg-surface-subtle/20">
              <button onClick={() => handleIssuesPdfOrPrint(true)} className="rounded bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-colors">Print</button>
              <button onClick={() => handleIssuesPdfOrPrint(false)} className="rounded bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-colors">Download PDF</button>
              <button onClick={handleExportIssuesExcel} disabled={issueExporting} className="rounded bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-60">
                {issueExporting ? 'Exporting…' : 'Export Excel'}
              </button>
              <button onClick={handleExportSelectedIssuesExcel} disabled={issueExporting} className="rounded bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-60">
                Export Selected
              </button>
              {selectedIssueIds.length > 0 && <span className="text-xs text-ink-muted">{selectedIssueIds.length} selected</span>}
            </div>
            {issueExportError && <div className="mx-3.5 mt-2 text-xs text-red-400 bg-red-950/40 p-2 rounded border border-red-800/40">{issueExportError}</div>}
            <div className="max-h-[calc(100vh-320px)] overflow-x-auto overflow-y-auto">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead className="sticky top-0 bg-page z-10">
                  <tr className="border-b border-border-soft uppercase text-ink-muted font-medium">
                    <th className="w-8 px-3 py-1.5">
                      {issues.length > 0 && (
                        <input type="checkbox" checked={selectedIssueIds.length === issues.length} onChange={toggleSelectAllIssues} />
                      )}
                    </th>
                    <th className="w-6 px-1 py-1.5 text-center"></th>
                    <th className="px-3 py-1.5">Issue #</th>
                    <th className="px-3 py-1.5">Order / Customer</th>
                    <th className="px-3 py-1.5">Salesman</th>
                    <th className="px-3 py-1.5">Date</th>
                    <th className="px-3 py-1.5 text-center">Items</th>
                    <th className="px-3 py-1.5 text-right">Total Qty</th>
                    <th className="px-3 py-1.5 text-right">Total Amount</th>
                    <th className="px-3 py-1.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft/60">
                  {pagedIssues.map((i) => {
                    const isExpanded = expandedIssueIds.includes(i.id);
                    return (
                      <Fragment key={i.id}>
                        <tr className="hover:bg-page/50 transition">
                          <td className="px-3 py-1.5">
                            <input type="checkbox" checked={selectedIssueIds.includes(i.id)} onChange={() => toggleSelectIssue(i.id)} />
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleExpandIssue(i.id)}
                              className="p-1 rounded hover:bg-surface-subtle text-ink-muted hover:text-ink transition cursor-pointer"
                              title={isExpanded ? 'Collapse product details' : 'View product prices & details'}
                            >
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-indigo-400" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                          <td className="px-3 py-1.5 font-mono font-medium text-ink">{i.issue_no}</td>
                          <td className="px-3 py-1.5">
                            {i.customer_name || i.prebooking_no ? (
                              <div className="flex flex-col gap-0.5">
                                {i.prebooking_no && (
                                  <span className="font-mono text-[11px] font-semibold text-indigo-400 flex items-center gap-1">
                                    <ShoppingCart size={10} /> {i.prebooking_no}
                                  </span>
                                )}
                                <span className="text-ink font-medium text-xs">
                                  {i.customer_name || 'Customer'}
                                </span>
                                {i.customer_phone && (
                                  <span className="text-[10px] text-ink-muted">
                                    {i.customer_phone}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-ink-muted text-[11px] italic">General Allocation</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-ink">{i.employee_name}</td>
                          <td className="px-3 py-1.5 text-ink-muted whitespace-nowrap">{i.issued_at}</td>
                          <td className="px-3 py-1.5 text-center text-ink-muted font-medium">{i.item_count}</td>
                          <td className="px-3 py-1.5 text-right font-semibold text-ink">{i.total_qty}</td>
                          <td className="px-3 py-1.5 text-right font-bold text-emerald-400 whitespace-nowrap">
                            ₹{Number(i.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-1.5 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setPrintingIssue(i)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
                              title="Print Stock Issue Bill"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print Bill</span>
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-surface-subtle/20 border-b border-border-soft">
                            <td colSpan={10} className="p-3">
                              <div className="bg-surface border border-border-soft rounded-lg p-3 space-y-2 shadow-xs">
                                <div className="flex flex-wrap items-center justify-between border-b border-border-soft pb-1.5 gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-xs text-ink">
                                      Product Breakdown — <span className="font-mono text-indigo-400">{i.issue_no}</span>
                                    </span>
                                    {i.prebooking_no && (
                                      <span className="text-[10.5px] bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded font-mono">
                                        Order: {i.prebooking_no}
                                      </span>
                                    )}
                                    {i.customer_name && (
                                      <span className="text-[10.5px] text-emerald-400 font-medium">
                                        Customer: {i.customer_name}
                                      </span>
                                    )}
                                    <span className="text-[11px] text-ink-muted">
                                      ({i.items?.length || 0} product{i.items?.length === 1 ? '' : 's'})
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setPrintingIssue(i)}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
                                  >
                                    <Printer className="w-3 h-3" />
                                    <span>Print Bill</span>
                                  </button>
                                </div>
                                <table className="w-full text-left text-xs border border-border-soft rounded overflow-hidden">
                                  <thead className="bg-surface-subtle text-ink-muted uppercase text-[10px] font-semibold">
                                    <tr>
                                      <th className="px-2.5 py-1.5 w-10 text-center">#</th>
                                      <th className="px-2.5 py-1.5">Product</th>
                                      <th className="px-2.5 py-1.5">SKU</th>
                                      <th className="px-2.5 py-1.5 text-center">Unit</th>
                                      <th className="px-2.5 py-1.5 text-right">Quantity</th>
                                      <th className="px-2.5 py-1.5 text-right">Unit Price</th>
                                      <th className="px-2.5 py-1.5 text-right">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border-soft/60">
                                    {i.items?.map((item, idx) => (
                                      <tr key={item.id || idx} className="hover:bg-page/40 transition">
                                        <td className="px-2.5 py-1.5 text-center text-ink-muted">{idx + 1}</td>
                                        <td className="px-2.5 py-1.5 font-medium text-ink">{item.item_name}</td>
                                        <td className="px-2.5 py-1.5 text-ink-muted font-mono">{item.item_code || '-'}</td>
                                        <td className="px-2.5 py-1.5 text-center text-ink-muted">{item.unit_code || '-'}</td>
                                        <td className="px-2.5 py-1.5 text-right font-medium text-ink">{item.qty}</td>
                                        <td className="px-2.5 py-1.5 text-right text-ink">
                                          ₹{Number(item.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-2.5 py-1.5 text-right font-semibold text-ink">
                                          ₹{Number(item.line_amount || (Number(item.qty || 0) * Number(item.unit_price || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    ))}
                                    {(!i.items || i.items.length === 0) && (
                                      <tr>
                                        <td colSpan={7} className="px-3 py-4 text-center text-ink-muted text-xs italic">
                                          No item lines recorded for this transaction.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                  <tfoot className="border-t border-border-soft bg-surface-subtle/50 font-semibold text-ink text-xs">
                                    <tr>
                                      <td colSpan={4} className="px-2.5 py-1.5 text-right text-ink-muted">Total:</td>
                                      <td className="px-2.5 py-1.5 text-right font-bold text-ink">{i.total_qty}</td>
                                      <td></td>
                                      <td className="px-2.5 py-1.5 text-right text-emerald-400 font-bold">
                                        ₹{Number(i.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {issues.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-ink-muted text-xs">
                        No issue transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={issuesPage} pageSize={10} total={issuesTotal} onPageChange={setIssuesPage} />
          </div>
        </div>
      </div>

      {printingIssue && (
        <PrintPreviewModal
          stockIssue={printingIssue}
          onClose={() => setPrintingIssue(null)}
        />
      )}

      {shortageWarning && (
        <ConfirmDialog
          variant="warning"
          title="Stock Warning"
          message="The requested quantity exceeds available stock for one or more items. Do you want to continue anyway?"
          details={shortageWarning.shortages.map((s) => (
            <div key={s.item_id} className="border-b border-[#EAF1FA] last:border-0 pb-1.5 last:pb-0">
              <span className="font-bold text-[#0B1B45]">{s.item_name}:</span> only {s.available} unit(s) available,
              but {s.requested} requested — exceeds by {s.excess} unit(s).
            </div>
          ))}
          confirmLabel="Continue"
          cancelLabel="Cancel"
          loading={mutation.isPending}
          onConfirm={confirmShortageAndIssue}
          onCancel={() => setShortageWarning(null)}
        />
      )}
    </div>
  );
}

export function Inventory() {
  const canView = usePermission('inventory.view_stock');
  const canAdjust = usePermission('inventory.stock_adjustment');
  const canIssue = usePermission('inventory.issue_van_stock');

  const tabs = [];
  if (canView) {
    tabs.push({ key: 'hub', label: 'Stock Hub', content: <StockHubPanel /> });
  }
  if (canAdjust) {
    tabs.push({ key: 'adjust', label: 'Stock Adjustment', content: <StockAdjustmentPanel canManage={canAdjust} /> });
  }
  if (canView || canIssue) {
    tabs.push({ key: 'van', label: 'Van / Salesman Stock', content: <VanStockPanel canManage={canIssue} /> });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-soft/40 pb-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            Inventory &amp; Stock Hub
          </h1>
          <p className="text-[11px] text-ink-muted mt-0.5">Monitor real-time warehouse inventory, stock adjustments, and van stock allocations</p>
        </div>
      </div>

      {tabs.length > 0 ? (
        <Tabs tabs={tabs} />
      ) : (
        <div className="card p-6 text-center text-xs text-ink-muted">
          You do not have permission to view inventory or van stock.
        </div>
      )}
    </div>
  );
}

