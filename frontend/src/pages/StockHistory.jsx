import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  History, ArrowDownLeft, ArrowUpRight, Sliders, RefreshCw,
  Search, Eye, FileText, Printer, Download, CheckCircle2, AlertCircle
} from 'lucide-react';
import { vanStockIssuesApi, stockAdjustmentsApi, stockHubApi } from '../api/purchasing';
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
  const stockQuery = useQuery({
    queryKey: ['stock-hub-returns'],
    queryFn: () => stockHubApi.list({ owner_type: 'employee' }),
  });

  const rows = stockQuery.data || [];
  const pagination = useClientPagination(rows, 10);

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-border-soft bg-[#FAF8FF]">
        <h3 className="text-sm font-extrabold text-ink">Van Stock Returns &amp; Day-End Balances</h3>
        <p className="text-[11px] text-ink-muted">
          Active stock balances reconciled or returned from salesman vans back to warehouse floor
        </p>
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
            {stockQuery.isLoading ? (
              <tr><td colSpan={6} className="p-6 text-center text-ink-muted">Loading returns data...</td></tr>
            ) : pagination.paginatedItems.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-ink-muted">No stock returns found.</td></tr>
            ) : (
              pagination.paginatedItems.map((r, idx) => (
                <tr key={idx} className="hover:bg-lavender-50/40 transition-colors">
                  <td className="px-3.5 py-2.5 font-bold text-ink">{r.item_name}</td>
                  <td className="px-3.5 py-2.5 text-ink-muted">{r.item_code}</td>
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
        page={pagination.page}
        pageSize={10}
        total={pagination.total}
        onPageChange={pagination.setPage}
      />
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
