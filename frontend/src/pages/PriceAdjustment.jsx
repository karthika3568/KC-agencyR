import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, AlertCircle, Search, X } from 'lucide-react';
import { pricingApi } from '../api/catalog';
import { Button } from '../components/Button.jsx';
import { Pagination } from '../components/Pagination';
import { Tabs } from '../components/Tabs.jsx';
import { useClientPagination } from '../hooks/useClientPagination';
import { handleFormKeyDown } from '../utils/formNavigation';
import { useUnsavedChangesGuard } from '../utils/escNavigation.jsx';

function PricingPanel({ type, label }) {
  const [search, setSearch] = useState('');
  const [edits, setEdits] = useState({});
  const [message, setMessage] = useState(null);
  const queryClient = useQueryClient();

  useUnsavedChangesGuard(Object.keys(edits).length > 0, {
    title: `Discard Unsaved ${label} Changes?`,
    message: 'You have unsaved price adjustments. Discard them and go back?',
  });

  const query = useQuery({
    queryKey: ['pricing', type, search],
    queryFn: () => pricingApi.list(type, search),
  });

  const saveMutation = useMutation({
    mutationFn: (items) => pricingApi.bulkSave(type, items),
  });

  const rawRows = query.data;
  const rows = Array.isArray(rawRows)
    ? rawRows
    : Array.isArray(rawRows?.data)
    ? rawRows.data
    : Array.isArray(rawRows?.items)
    ? rawRows.items
    : [];

  const {
    page,
    setPage,
    total,
    paginatedItems: pagedRows,
    resetPage,
  } = useClientPagination(rows, 10);

  const changedIds = Object.keys(edits);

  const handleChange = (itemId, value) => {
    setMessage(null);
    setEdits((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleSave = async () => {
    setMessage(null);
    const items = changedIds
      .map((id) => ({ item_id: Number(id), price: edits[id] === '' ? null : Number(edits[id]) }))
      .filter((row) => row.price !== null);

    if (items.length === 0) return;
    const invalid = items.find((row) => Number.isNaN(row.price) || row.price < 0);
    if (invalid) {
      setMessage({ kind: 'error', text: `${label} price must be a non-negative number.` });
      return;
    }

    try {
      const result = await saveMutation.mutateAsync(items);
      setMessage({
        kind: 'success',
        text: `Saved ${result.updated} ${label.toLowerCase()} price${result.updated === 1 ? '' : 's'}.`,
      });
      setEdits({});
      queryClient.invalidateQueries({ queryKey: ['pricing', type] });
    } catch (err) {
      setMessage({ kind: 'error', text: err?.response?.data?.error || 'Save failed' });
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-80 md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search item name / code / barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border-soft bg-white pl-8 pr-7 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <Button size="sm" onClick={handleSave} disabled={changedIds.length === 0 || saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : `Save${changedIds.length ? ` (${changedIds.length})` : ''}`}
        </Button>
        {changedIds.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setEdits({});
              setMessage(null);
            }}
            className="text-xs font-medium text-ink-muted hover:underline"
          >
            Reset
          </button>
        )}
        {message && (
          <span className={`text-xs font-medium ${message.kind === 'error' ? 'text-danger' : 'text-success'}`}>
            {message.text}
          </span>
        )}
      </div>

      {query.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{query.error?.response?.data?.error || query.error?.message || 'Failed to load item prices.'}</span>
        </div>
      )}

      <div data-form-container="true" onKeyDown={handleFormKeyDown} className="card overflow-hidden">
        {/* Mobile & Tablet Card View (< md) */}
        <div className="md:hidden divide-y divide-border-soft max-h-[calc(100dvh-240px)] overflow-y-auto">
          {query.isLoading && (
            <div className="p-6 text-center text-xs text-ink-muted">Loading items…</div>
          )}
          {!query.isLoading && !query.isError && rows.length === 0 && (
            <div className="p-6 text-center text-xs text-ink-muted">No items found.</div>
          )}
          {!query.isLoading &&
            !query.isError &&
            pagedRows.map((r) => {
              const edited = Object.prototype.hasOwnProperty.call(edits, r.id);
              const value = edited ? edits[r.id] : r.price ?? '';
              return (
                <div
                  key={r.id}
                  className={`p-3 space-y-2 transition-colors ${
                    edited ? 'bg-amber-500/10 ring-1 ring-amber-500/30' : 'hover:bg-page/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-ink break-words">{r.item_name}</div>
                      <div className="text-[11px] text-ink-muted font-mono mt-0.5">{r.item_code}</div>
                    </div>
                    {edited && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                        Modified
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-surface-subtle/40 p-2 text-[11px]">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-ink-muted">Unit</div>
                      <div className="font-semibold text-ink">{r.unit_code || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-ink-muted">MRP</div>
                      <div className="font-semibold text-ink">₹{r.mrp}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-ink-muted">Normal S.Rate</div>
                      <div className="font-semibold text-ink">₹{r.net_srate}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-soft/60">
                    <label className="text-xs font-semibold text-ink">{label} Price:</label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-ink-muted">₹</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        data-table-nav="true"
                        value={value}
                        placeholder="Not set"
                        onChange={(e) => handleChange(r.id, e.target.value)}
                        className="input w-32 text-right text-xs font-semibold focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block max-h-[calc(100vh-200px)] overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[540px] text-xs">
            <thead className="sticky top-0 bg-page z-10 shadow-sm">
              <tr className="border-b border-border-soft text-left uppercase text-ink-muted font-medium bg-surface-subtle/30">
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2 text-right">MRP</th>
                <th className="px-3 py-2 text-right">Normal NET_SRATE</th>
                <th className="px-3 py-2 text-right">{label} Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft/60">
              {query.isLoading && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-ink-muted">Loading items…</td>
                </tr>
              )}
              {!query.isLoading && !query.isError && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-ink-muted">No items found.</td>
                </tr>
              )}
              {!query.isLoading &&
                !query.isError &&
                pagedRows.map((r) => {
                  const edited = Object.prototype.hasOwnProperty.call(edits, r.id);
                  const value = edited ? edits[r.id] : r.price ?? '';
                  return (
                    <tr key={r.id} className={`hover:bg-surface-subtle/20 transition ${edited ? 'bg-highlight' : ''}`}>
                      <td className="px-3 py-1.5 font-medium text-ink">
                        {r.item_name} <span className="font-normal text-ink-muted">({r.item_code})</span>
                      </td>
                      <td className="px-3 py-1.5 text-ink-muted">{r.unit_code || '—'}</td>
                      <td className="px-3 py-1.5 text-right text-ink-muted">₹{r.mrp}</td>
                      <td className="px-3 py-1.5 text-right text-ink-muted">₹{r.net_srate}</td>
                      <td className="px-3 py-1.5 text-right">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          data-table-nav="true"
                          value={value}
                          placeholder="Not set"
                          onChange={(e) => handleChange(r.id, e.target.value)}
                          className="input w-24 text-right text-xs"
                        />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={10} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}

export function PriceAdjustment() {
  const [activeTab, setActiveTab] = useState('wholesale');

  const tabs = [
    {
      key: 'wholesale',
      label: 'Wholesale Price',
      content: <PricingPanel type="wholesale" label="Wholesale" />,
    },
    {
      key: 'retail',
      label: 'Retail Price',
      content: <PricingPanel type="retail" label="Retail" />,
    },
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-soft pb-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-500" />
            Price Adjustment
          </h1>
          <p className="text-xs text-ink-muted">
            Manage wholesale &amp; retail selling prices across your product catalog
          </p>
        </div>
      </div>

      <Tabs activeKey={activeTab} onTabChange={setActiveTab} tabs={tabs} />
    </div>
  );
}
