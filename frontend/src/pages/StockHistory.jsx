import { useState, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  History, ArrowDownLeft, ArrowUpRight, Sliders, RefreshCw,
  Search, Eye, FileText, Printer, Download, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, RotateCcw
} from 'lucide-react';
import { vanStockIssuesApi, vanStockReturnsApi, stockAdjustmentsApi, stockHubApi } from '../api/purchasing';
import { usePermission } from '../hooks/usePermission';
import { Tabs } from '../components/Tabs.jsx';
import { Button } from '../components/Button.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { useClientPagination } from '../hooks/useClientPagination';
import { StockAdjustmentPanel, StockHubPanel } from './Inventory.jsx';
import { PrintPreviewModal } from '../components/PrintPreviewModal';
import { downloadVanIssuePdf } from '../utils/reportPdf';

function StockIssuesTab() {
  const [search, setSearch] = useState('');
  const [printingIssue, setPrintingIssue] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);

  const issuesQuery = useQuery({
    queryKey: ['van-issues-history'],
    queryFn: () => vanStockIssuesApi.list(),
  });

  const issues = issuesQuery.data || [];
  const filtered = issues.filter((i) => {
    const q = search.toLowerCase();
    return (
      (i.issue_no || '').toLowerCase().includes(q) ||
      (i.employee_name || '').toLowerCase().includes(q) ||
      (i.notes || '').toLowerCase().includes(q)
    );
  });

  const pagination = useClientPagination(filtered, 10);

  const handlePrint = async (issue) => {
    try {
      const full = await vanStockIssuesApi.get(issue.id);
      setPrintingIssue(full);
    } catch (e) {
      alert('Unable to load issue note for printing');
    }
  };

  const handleDownloadPdf = async (issue) => {
    try {
      const detailRows = await vanStockIssuesApi.detail([issue.id]);
      downloadVanIssuePdf(detailRows, `${issue.issue_no}.pdf`, { print: false });
    } catch (e) {
      alert('Unable to generate PDF document');
    }
  };

  const handleExportExcel = async () => {
    setExportError('');
    setExporting(true);
    try {
      await vanStockIssuesApi.downloadExport(filtered.map((i) => i.id));
    } catch (err) {
      setExportError(err?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-white p-3 rounded-2xl border border-border-soft shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Search by issue #, salesman, or note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border-soft bg-page pl-9 pr-3 py-1.5 text-xs text-ink focus:bg-white focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportExcel}
            loading={exporting}
            className="rounded-xl text-xs font-bold"
          >
            <Download size={13} />
            <span>Export Excel</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => issuesQuery.refetch()}
            className="rounded-xl text-xs font-bold"
          >
            <RefreshCw size={13} />
          </Button>
        </div>
      </div>

      {exportError && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{exportError}</span>
        </div>
      )}

      {/* Issues Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8FF] border-b border-border-soft text-ink-muted font-bold uppercase text-[10.5px]">
              <tr>
                <th className="px-3.5 py-2.5">Issue #</th>
                <th className="px-3.5 py-2.5">Issued To (Salesman)</th>
                <th className="px-3.5 py-2.5">Date &amp; Time</th>
                <th className="px-3.5 py-2.5 text-center">Items</th>
                <th className="px-3.5 py-2.5 text-right">Total Qty</th>
                <th className="px-3.5 py-2.5 text-right">Total Amount</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft/60">
              {issuesQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-ink-muted">Loading stock issues...</td>
                </tr>
              ) : pagination.paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-ink-muted">
                    No stock issue transactions recorded.
                  </td>
                </tr>
              ) : (
                pagination.paginatedItems.map((issue) => (
                  <tr key={issue.id} className="hover:bg-lavender-50/40 transition-colors">
                    <td className="px-3.5 py-2.5 font-extrabold text-[#8244AD]">{issue.issue_no}</td>
                    <td className="px-3.5 py-2.5 font-bold text-ink">{issue.employee_name}</td>
                    <td className="px-3.5 py-2.5 text-ink-muted">{issue.issued_at || '-'}</td>
                    <td className="px-3.5 py-2.5 text-center">
                      <span className="rounded-full bg-lavender-100 px-2 py-0.5 text-[10.5px] font-bold text-primary">
                        {issue.item_count || (issue.items ? issue.items.length : 0)} items
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-extrabold text-ink">{Number(issue.total_qty || 0)}</td>
                    <td className="px-3.5 py-2.5 text-right font-black text-ink">
                      ₹{Number(issue.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedIssue(issue)}
                          className="rounded-lg p-1 text-ink-muted hover:bg-lavender-100 hover:text-primary transition-colors"
                          title="View Items"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrint(issue)}
                          className="rounded-lg p-1 text-ink-muted hover:bg-lavender-100 hover:text-primary transition-colors"
                          title="Print Issue Slip"
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(issue)}
                          className="rounded-lg p-1 text-ink-muted hover:bg-lavender-100 hover:text-primary transition-colors"
                          title="Download PDF"
                        >
                          <Download size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={pagination.page}
          pageSize={10}
          total={pagination.total}
          onPageChange={pagination.setPage}
        />
      </div>

      {/* Detail Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-border-soft pb-2.5">
              <div>
                <h3 className="text-sm font-extrabold text-ink">Issue #{selectedIssue.issue_no}</h3>
                <p className="text-[11px] text-ink-muted">Salesman: {selectedIssue.employee_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIssue(null)}
                className="rounded-full p-1 text-ink-muted hover:bg-page"
              >
                ✕
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-page text-ink-muted text-[10px] uppercase font-bold">
                  <tr>
                    <th className="p-2">Item</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft/60">
                  {(selectedIssue.items || []).map((line, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-medium text-ink">{line.item_name}</td>
                      <td className="p-2 text-right font-bold text-ink">{line.qty} {line.unit_code}</td>
                      <td className="p-2 text-right text-ink-muted">₹{line.unit_price}</td>
                      <td className="p-2 text-right font-extrabold text-ink">₹{line.line_amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-border-soft">
              <Button variant="secondary" size="sm" onClick={() => setSelectedIssue(null)} className="rounded-xl">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {printingIssue && (
        <PrintPreviewModal
          stockIssue={printingIssue}
          onClose={() => setPrintingIssue(null)}
        />
      )}
    </div>
  );
}

function StockReturnsTab() {
  const [search, setSearch] = useState('');
  const [balanceSearch, setBalanceSearch] = useState('');
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [expandedReturns, setExpandedReturns] = useState({});
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);

  const returnsQuery = useQuery({
    queryKey: ['van-returns-history'],
    queryFn: () => vanStockReturnsApi.list(),
  });

  const balancesQuery = useQuery({
    queryKey: ['stock-hub-returns'],
    queryFn: () => stockHubApi.list({ owner_type: 'employee' }),
  });

  const toggleExpand = (id) => {
    setExpandedReturns((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const returns = returnsQuery.data || [];
  const filteredReturns = returns.filter((r) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const matchHeader =
      (r.return_no || '').toLowerCase().includes(q) ||
      (r.employee_name || '').toLowerCase().includes(q) ||
      (r.returned_by_name || '').toLowerCase().includes(q) ||
      (r.notes || '').toLowerCase().includes(q) ||
      (r.issue_no || '').toLowerCase().includes(q);
    if (matchHeader) return true;
    return (r.items || []).some(
      (it) =>
        (it.item_name || '').toLowerCase().includes(q) ||
        (it.item_code || '').toLowerCase().includes(q)
    );
  });

  const returnsPagination = useClientPagination(filteredReturns, 10);

  const balances = balancesQuery.data || [];
  const filteredBalances = balances.filter((b) => {
    const q = balanceSearch.toLowerCase();
    if (!q) return true;
    return (
      (b.item_name || '').toLowerCase().includes(q) ||
      (b.item_code || '').toLowerCase().includes(q) ||
      (b.owner_name || '').toLowerCase().includes(q) ||
      (b.branch_name || '').toLowerCase().includes(q)
    );
  });

  const balancesPagination = useClientPagination(filteredBalances, 10);

  const handleExportExcel = async () => {
    setExportError('');
    setExporting(true);
    try {
      await vanStockReturnsApi.downloadExport(filteredReturns.map((r) => r.id));
    } catch (err) {
      setExportError(err?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. STOCK RETURN TRANSACTIONS (HISTORICAL RETURNS) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-white p-3 rounded-2xl border border-border-soft shadow-2xs">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Search returns by return #, salesman, reason, or item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border-soft bg-page pl-9 pr-3 py-1.5 text-xs text-ink focus:bg-white focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportExcel}
              loading={exporting}
              className="rounded-xl text-xs font-bold"
            >
              <Download size={13} />
              <span>Export Excel</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                returnsQuery.refetch();
                balancesQuery.refetch();
              }}
              className="rounded-xl text-xs font-bold"
              title="Refresh"
            >
              <RefreshCw size={13} className={returnsQuery.isFetching ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>

        {exportError && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{exportError}</span>
          </div>
        )}

        {returnsQuery.isError && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} />
              <span>Failed to load stock return transactions. {returnsQuery.error?.message || ''}</span>
            </div>
            <Button size="xs" variant="secondary" onClick={() => returnsQuery.refetch()}>
              Retry
            </Button>
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="p-3.5 border-b border-border-soft bg-[#FAF8FF] flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h3 className="text-sm font-extrabold text-ink flex items-center gap-2">
                <span>Stock Return Transactions</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lavender-100 text-primary">
                  {returns.length} {returns.length === 1 ? 'Record' : 'Records'}
                </span>
              </h3>
              <p className="text-[11px] text-ink-muted">
                Audit history of stock returned from mobile vans back to warehouse inventory
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8FF] border-b border-border-soft text-ink-muted font-bold uppercase text-[10.5px]">
                <tr>
                  <th className="w-8 px-2 py-2.5 text-center"></th>
                  <th className="px-3.5 py-2.5">Return #</th>
                  <th className="px-3.5 py-2.5">Salesman / Van</th>
                  <th className="px-3.5 py-2.5">Return Date &amp; Time</th>
                  <th className="px-3.5 py-2.5">Returned Items</th>
                  <th className="px-3.5 py-2.5 text-right">Quantity Returned</th>
                  <th className="px-3.5 py-2.5 text-right">Value (₹)</th>
                  <th className="px-3.5 py-2.5">Reason / Notes</th>
                  <th className="px-3.5 py-2.5">Recorded By</th>
                  <th className="px-3.5 py-2.5 text-center">Status</th>
                  <th className="px-3.5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft/60">
                {returnsQuery.isLoading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-xs text-ink-muted">
                      Loading stock return transactions...
                    </td>
                  </tr>
                ) : returnsPagination.paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-xs text-ink-muted">
                      {search ? 'No return transactions match your search.' : 'No stock return transactions recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  returnsPagination.paginatedItems.map((ret) => {
                    const isExpanded = !!expandedReturns[ret.id];
                    const items = ret.items || [];
                    const singleItem = items.length === 1 ? items[0] : null;

                    return (
                      <Fragment key={ret.id}>
                        <tr className="hover:bg-lavender-50/40 transition-colors">
                          <td className="px-2 py-2.5 text-center">
                            {items.length > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleExpand(ret.id)}
                                className="p-1 rounded hover:bg-lavender-100 text-ink-muted hover:text-primary transition cursor-pointer"
                                title={isExpanded ? 'Collapse item details' : 'Expand item details'}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-primary" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 font-extrabold text-[#8244AD] font-mono whitespace-nowrap">
                            {ret.return_no || `#${ret.id}`}
                          </td>
                          <td className="px-3.5 py-2.5 font-bold text-ink whitespace-nowrap">
                            {ret.employee_name || '-'}
                          </td>
                          <td className="px-3.5 py-2.5 text-ink-muted whitespace-nowrap">
                            {ret.returned_at || '-'}
                          </td>
                          <td className="px-3.5 py-2.5">
                            {singleItem ? (
                              <div className="flex flex-col">
                                <span className="font-semibold text-ink">{singleItem.item_name}</span>
                                <span className="text-[10px] text-ink-muted font-mono">{singleItem.item_code}</span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-lavender-100 px-2 py-0.5 text-[10.5px] font-bold text-primary">
                                {items.length} items
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-extrabold text-ink whitespace-nowrap">
                            {Number(ret.total_qty || 0)} {singleItem ? singleItem.unit_code : ''}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-black text-ink whitespace-nowrap">
                            ₹{Number(ret.total_amount || 0).toFixed(2)}
                          </td>
                          <td className="px-3.5 py-2.5 text-ink-muted max-w-[160px] truncate" title={ret.notes || ''}>
                            {ret.notes || <span className="text-ink-muted/40 italic">-</span>}
                          </td>
                          <td className="px-3.5 py-2.5 text-ink-muted whitespace-nowrap">
                            {ret.returned_by_name || '-'}
                          </td>
                          <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={10} />
                              Completed
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedReturn(ret)}
                              className="rounded-lg p-1 text-ink-muted hover:bg-lavender-100 hover:text-primary transition-colors cursor-pointer"
                              title="View Items"
                            >
                              <Eye size={15} />
                            </button>
                          </td>
                        </tr>

                        {/* Inline Item Details when Expanded */}
                        {isExpanded && items.length > 0 && (
                          <tr className="bg-lavender-50/20 border-b border-border-soft">
                            <td colSpan={11} className="p-3 pl-8">
                              <div className="bg-white border border-border-soft rounded-xl p-3 space-y-2 shadow-2xs">
                                <div className="flex items-center justify-between border-b border-border-soft pb-1.5">
                                  <span className="font-bold text-xs text-ink flex items-center gap-1.5">
                                    <span>Returned Items Breakdown</span>
                                    <span className="font-mono text-primary font-normal">({ret.return_no || `#${ret.id}`})</span>
                                  </span>
                                  <span className="text-[11px] text-ink-muted">
                                    {items.length} item{items.length === 1 ? '' : 's'} recorded
                                  </span>
                                </div>
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-[#FAF8FF] text-ink-muted uppercase text-[10px] font-bold">
                                    <tr>
                                      <th className="px-2.5 py-1.5">#</th>
                                      <th className="px-2.5 py-1.5">Item Name</th>
                                      <th className="px-2.5 py-1.5">SKU</th>
                                      <th className="px-2.5 py-1.5 text-right">Quantity Returned</th>
                                      <th className="px-2.5 py-1.5 text-right">Rate</th>
                                      <th className="px-2.5 py-1.5 text-right">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border-soft/60">
                                    {items.map((line, idx) => (
                                      <tr key={idx} className="hover:bg-lavender-50/20">
                                        <td className="px-2.5 py-1.5 text-ink-muted">{idx + 1}</td>
                                        <td className="px-2.5 py-1.5 font-bold text-ink">{line.item_name}</td>
                                        <td className="px-2.5 py-1.5 text-ink-muted font-mono">{line.item_code}</td>
                                        <td className="px-2.5 py-1.5 text-right font-extrabold text-ink">
                                          {Number(line.qty || 0)} {line.unit_code}
                                        </td>
                                        <td className="px-2.5 py-1.5 text-right text-ink-muted">
                                          ₹{Number(line.unit_price || 0).toFixed(2)}
                                        </td>
                                        <td className="px-2.5 py-1.5 text-right font-bold text-ink">
                                          ₹{Number(line.line_amount || 0).toFixed(2)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={returnsPagination.page}
            pageSize={10}
            total={returnsPagination.total}
            onPageChange={returnsPagination.setPage}
          />
        </div>
      </div>

      {/* 2. CURRENT VAN STOCK BALANCES (PRESERVED TABLE) */}
      <div className="space-y-3">
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-border-soft bg-[#FAF8FF] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-ink flex items-center gap-2">
                <span>Current Van Stock Balances</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {balances.length} {balances.length === 1 ? 'Item' : 'Items'}
                </span>
              </h3>
              <p className="text-[11px] text-ink-muted">
                Active on-hand stock quantities currently held in salesman vans (not yet returned)
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Filter balances by item or salesman..."
                value={balanceSearch}
                onChange={(e) => setBalanceSearch(e.target.value)}
                className="w-full rounded-xl border border-border-soft bg-white pl-8 pr-3 py-1 text-xs text-ink focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8FF] border-b border-border-soft text-ink-muted font-bold uppercase text-[10.5px]">
                <tr>
                  <th className="px-3.5 py-2.5">Item Name</th>
                  <th className="px-3.5 py-2.5">SKU</th>
                  <th className="px-3.5 py-2.5">Van / Salesman</th>
                  <th className="px-3.5 py-2.5">Branch</th>
                  <th className="px-3.5 py-2.5 text-right">On-hand Qty</th>
                  <th className="px-3.5 py-2.5 text-right">Value (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft/60">
                {balancesQuery.isLoading ? (
                  <tr><td colSpan={6} className="p-6 text-center text-ink-muted">Loading van stock balances...</td></tr>
                ) : balancesPagination.paginatedItems.length === 0 ? (
                  <tr><td colSpan={6} className="p-6 text-center text-ink-muted">
                    {balanceSearch ? 'No van stock balances match your filter.' : 'No active van stock balances found.'}
                  </td></tr>
                ) : (
                  balancesPagination.paginatedItems.map((r, idx) => (
                    <tr key={idx} className="hover:bg-lavender-50/40 transition-colors">
                      <td className="px-3.5 py-2.5 font-bold text-ink">{r.item_name}</td>
                      <td className="px-3.5 py-2.5 text-ink-muted font-mono">{r.item_code}</td>
                      <td className="px-3.5 py-2.5 font-semibold text-primary">{r.owner_name}</td>
                      <td className="px-3.5 py-2.5 text-ink-muted">{r.branch_name || '-'}</td>
                      <td className="px-3.5 py-2.5 text-right font-extrabold text-ink">{r.quantity_on_hand} {r.unit_code}</td>
                      <td className="px-3.5 py-2.5 text-right font-extrabold text-ink">₹{Number(r.stock_value || 0).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={balancesPagination.page}
            pageSize={10}
            total={balancesPagination.total}
            onPageChange={balancesPagination.setPage}
          />
        </div>
      </div>

      {/* Return Detail Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border-soft pb-2.5">
              <div>
                <h3 className="text-sm font-extrabold text-ink flex items-center gap-2">
                  <span>Return Note #{selectedReturn.return_no || selectedReturn.id}</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    Completed
                  </span>
                </h3>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Salesman / Van: <span className="font-semibold text-ink">{selectedReturn.employee_name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReturn(null)}
                className="rounded-full p-1 text-ink-muted hover:bg-page"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-page/50 p-3 rounded-2xl border border-border-soft/60">
              <div>
                <span className="text-[10.5px] text-ink-muted block">Return Date &amp; Time</span>
                <span className="font-medium text-ink">{selectedReturn.returned_at || '-'}</span>
              </div>
              <div>
                <span className="text-[10.5px] text-ink-muted block">Recorded By</span>
                <span className="font-medium text-ink">{selectedReturn.returned_by_name || '-'}</span>
              </div>
              <div>
                <span className="text-[10.5px] text-ink-muted block">Branch</span>
                <span className="font-medium text-ink">{selectedReturn.branch_name || '-'}</span>
              </div>
              <div>
                <span className="text-[10.5px] text-ink-muted block">Linked Issue #</span>
                <span className="font-medium text-ink">{selectedReturn.issue_no || 'Direct Return'}</span>
              </div>
              {selectedReturn.notes && (
                <div className="col-span-2 pt-1 border-t border-border-soft/40">
                  <span className="text-[10.5px] text-ink-muted block">Reason / Notes</span>
                  <span className="font-medium text-ink">{selectedReturn.notes}</span>
                </div>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-page text-ink-muted text-[10px] uppercase font-bold sticky top-0">
                  <tr>
                    <th className="p-2">Item</th>
                    <th className="p-2 text-right">Quantity Returned</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft/60">
                  {(selectedReturn.items || []).map((line, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-medium text-ink">
                        <div>{line.item_name}</div>
                        <div className="text-[10px] text-ink-muted font-mono">{line.item_code}</div>
                      </td>
                      <td className="p-2 text-right font-bold text-ink">
                        {Number(line.qty || 0)} {line.unit_code}
                      </td>
                      <td className="p-2 text-right text-ink-muted">₹{Number(line.unit_price || 0).toFixed(2)}</td>
                      <td className="p-2 text-right font-extrabold text-ink">₹{Number(line.line_amount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border-soft font-bold bg-[#FAF8FF]">
                  <tr>
                    <td className="p-2 text-ink">Total</td>
                    <td className="p-2 text-right text-ink font-extrabold">
                      {Number(selectedReturn.total_qty || 0)}
                    </td>
                    <td className="p-2"></td>
                    <td className="p-2 text-right font-black text-ink">
                      ₹{Number(selectedReturn.total_amount || 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-border-soft">
              <Button variant="secondary" size="sm" onClick={() => setSelectedReturn(null)} className="rounded-xl">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export function StockHistory() {
  const canAdjust = usePermission('inventory.stock_adjustment');
  const canView = usePermission('inventory.view_stock');

  const tabs = [
    { key: 'issues', label: 'Stock Issues', content: <StockIssuesTab /> },
    { key: 'returns', label: 'Stock Returns', content: <StockReturnsTab /> },
    ...(canAdjust ? [{ key: 'adjustments', label: 'Stock Adjustments', content: <StockAdjustmentPanel canManage={canAdjust} /> }] : []),
    ...(canView ? [{ key: 'movements', label: 'Stock Movement History', content: <StockHubPanel /> }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-soft/40 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <History className="w-5 h-5 text-[#8244AD]" />
            Stock Movement &amp; Issue History
          </h1>
          <p className="text-[11px] text-ink-muted mt-0.5">
            Audit history of stock issues to mobile vans, day-end return entries, and adjustments
          </p>
        </div>
      </div>

      <Tabs tabs={tabs} />
    </div>
  );
}

export default StockHistory;
