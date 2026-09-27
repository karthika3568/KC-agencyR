import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, AlertCircle, Search, X } from 'lucide-react';
import { pricingApi } from '../api/catalog';
import { Button } from '../components/Button.jsx';

function PricingPanel({ type, label }) {
  const [search, setSearch] = useState('');
  const [edits, setEdits] = useState({});
  const [message, setMessage] = useState(null);
  const queryClient = useQueryClient();

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-96 md:w-[480px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search item name / code / barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border-soft bg-white pl-9 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none shadow-2xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
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
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{query.error?.response?.data?.error || query.error?.message || 'Failed to load item prices.'}</span>
        </div>
      )}

      <div className="overflow-x-auto card">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-soft text-left uppercase text-ink-muted font-medium">
              <th className="px-4 py-2.5">Item</th>
              <th className="px-4 py-2.5">Unit</th>
              <th className="px-4 py-2.5 text-right">MRP</th>
              <th className="px-4 py-2.5 text-right">Normal NET_SRATE</th>
              <th className="px-4 py-2.5 text-right">{label} Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft/60">
            {query.isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-muted">Loading items…</td>
              </tr>
            )}
            {!query.isLoading && !query.isError && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-muted">No items found.</td>
              </tr>
            )}
            {!query.isLoading &&
              !query.isError &&
              rows.map((r) => {
                const edited = Object.prototype.hasOwnProperty.call(edits, r.id);
                const value = edited ? edits[r.id] : r.price ?? '';
                return (
                  <tr key={r.id} className={`hover:bg-surface-subtle/20 transition ${edited ? 'bg-highlight' : ''}`}>
                    <td className="px-4 py-2 font-medium text-ink">
                      {r.item_name} <span className="font-normal text-ink-muted">({r.item_code})</span>
                    </td>
                    <td className="px-4 py-2 text-ink-muted">{r.unit_code || '—'}</td>
                    <td className="px-4 py-2 text-right text-ink-muted">₹{r.mrp}</td>
                    <td className="px-4 py-2 text-right text-ink-muted">₹{r.net_srate}</td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={value}
                        placeholder="Not set"
                        onChange={(e) => handleChange(r.id, e.target.value)}
                        className="input w-28 text-right text-xs"
                      />
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PriceAdjustment() {
  const [activeTab, setActiveTab] = useState('wholesale');

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-soft pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            <Tag className="w-6 h-6 text-indigo-500" />
            Price Adjustment
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Manage wholesale &amp; retail selling prices across your product catalog
          </p>
        </div>

        {/* Sub-nav tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('wholesale')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'wholesale'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Wholesale Price
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('retail')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'retail'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Retail Price
          </button>
        </div>
      </div>

      {activeTab === 'wholesale' ? (
        <PricingPanel type="wholesale" label="Wholesale" />
      ) : (
        <PricingPanel type="retail" label="Retail" />
      )}
    </div>
  );
}
