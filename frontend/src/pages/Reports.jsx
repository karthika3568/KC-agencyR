import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api/admin';
import { Tabs } from '../components/Tabs';
import { usePermission } from '../hooks/usePermission';

function DateRangeBar({ from, to, setFrom, setTo, onExport, canExport }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <label className="text-xs text-gray-500">From</label>
      <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input w-40" />
      <label className="text-xs text-gray-500">To</label>
      <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input w-40" />
      {canExport && (
        <button onClick={onExport} className="ml-auto rounded bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200">
          Export to Excel
        </button>
      )}
    </div>
  );
}

function useDateRange() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + '01';
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  return { from, to, setFrom, setTo };
}

function GenericTable({ rows, columns }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
            {columns.map((c) => <th key={c.key} className="whitespace-nowrap px-4 py-2">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-gray-50">
              {columns.map((c) => <td key={c.key} className="whitespace-nowrap px-4 py-2">{r[c.key]}</td>)}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={columns.length} className="px-4 py-6 text-center text-gray-400">No data for this range.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function GstRegisterPanel({ canExport }) {
  const { from, to, setFrom, setTo } = useDateRange();
  const query = useQuery({ queryKey: ['report-gst', from, to], queryFn: () => reportsApi.gstRegister({ from, to }) });
  return (
    <div>
      <DateRangeBar from={from} to={to} setFrom={setFrom} setTo={setTo} canExport={canExport} onExport={() => reportsApi.downloadExport('gst-register', { from, to })} />
      <GenericTable
        rows={query.data || []}
        columns={[
          { key: 'invoice_no', label: 'Invoice #' }, { key: 'invoice_date', label: 'Date' }, { key: 'customer_name', label: 'Customer' },
          { key: 'taxable_value', label: 'Taxable' }, { key: 'cgst_amount', label: 'CGST' }, { key: 'sgst_amount', label: 'SGST' },
          { key: 'grand_total', label: 'Grand Total' }, { key: 'payment_status', label: 'Status' },
        ]}
      />
    </div>
  );
}

function NonGstRegisterPanel({ canExport }) {
  const { from, to, setFrom, setTo } = useDateRange();
  const query = useQuery({ queryKey: ['report-non-gst', from, to], queryFn: () => reportsApi.nonGstRegister({ from, to }) });
  return (
    <div>
      <DateRangeBar from={from} to={to} setFrom={setFrom} setTo={setTo} canExport={canExport} onExport={() => reportsApi.downloadExport('non-gst-register', { from, to })} />
      <GenericTable
        rows={query.data || []}
        columns={[
          { key: 'invoice_no', label: 'Estimate #' }, { key: 'invoice_date', label: 'Date' }, { key: 'customer_name', label: 'Customer' },
          { key: 'grand_total', label: 'Grand Total' }, { key: 'payment_status', label: 'Status' },
        ]}
      />
    </div>
  );
}

function PurchaseRegisterPanel({ canExport, canViewCost }) {
  const { from, to, setFrom, setTo } = useDateRange();
  const query = useQuery({ queryKey: ['report-purchases', from, to], queryFn: () => reportsApi.purchaseRegister({ from, to }) });
  const columns = [
    { key: 'grn_no', label: 'GRN #' }, { key: 'purchase_date', label: 'Date' }, { key: 'supplier_name', label: 'Supplier' },
    ...(canViewCost ? [{ key: 'grand_total', label: 'Grand Total' }, { key: 'paid_amount', label: 'Paid' }, { key: 'pending_balance', label: 'Pending' }] : []),
    { key: 'status', label: 'Status' },
  ];
  return (
    <div>
      <DateRangeBar from={from} to={to} setFrom={setFrom} setTo={setTo} canExport={canExport} onExport={() => reportsApi.downloadExport('purchase-register', { from, to })} />
      <GenericTable rows={query.data || []} columns={columns} />
    </div>
  );
}

function ItemWiseSalesPanel({ canExport }) {
  const { from, to, setFrom, setTo } = useDateRange();
  const query = useQuery({ queryKey: ['report-items', from, to], queryFn: () => reportsApi.itemWiseSales({ from, to }) });
  return (
    <div>
      <DateRangeBar from={from} to={to} setFrom={setFrom} setTo={setTo} canExport={canExport} onExport={() => reportsApi.downloadExport('item-wise-sales', { from, to })} />
      <GenericTable
        rows={query.data || []}
        columns={[
          { key: 'item_name', label: 'Item' }, { key: 'total_qty', label: 'Qty Sold' }, { key: 'total_free_qty', label: 'Free Qty' },
          { key: 'total_taxable', label: 'Taxable Value' }, { key: 'total_tax', label: 'Tax' },
        ]}
      />
    </div>
  );
}

function CreditOutstandingPanel() {
  const query = useQuery({ queryKey: ['report-credit-outstanding'], queryFn: reportsApi.creditOutstanding });
  return (
    <GenericTable
      rows={query.data || []}
      columns={[
        { key: 'customer_name', label: 'Customer' }, { key: 'phone', label: 'Phone' }, { key: 'credit_limit', label: 'Credit Limit' },
        { key: 'total_outstanding', label: 'Outstanding' }, { key: 'days_overdue', label: 'Days Overdue' }, { key: 'over_limit', label: 'Over Limit?' },
      ]}
    />
  );
}

function ExpenseIncomePanel({ canExport }) {
  const { from, to, setFrom, setTo } = useDateRange();
  const query = useQuery({ queryKey: ['report-expense-income', from, to], queryFn: () => reportsApi.expenseIncome({ from, to }) });
  return (
    <div>
      <DateRangeBar from={from} to={to} setFrom={setFrom} setTo={setTo} canExport={canExport} onExport={() => reportsApi.downloadExport('expense-income', { from, to })} />
      <GenericTable
        rows={query.data || []}
        columns={[
          { key: 'type', label: 'Type' }, { key: 'ref_no', label: 'Reference #' }, { key: 'category', label: 'Category' },
          { key: 'amount', label: 'Amount' }, { key: 'description', label: 'Description' }, { key: 'ref_date', label: 'Date' },
        ]}
      />
    </div>
  );
}

function ProfitPanel() {
  const { from, to, setFrom, setTo } = useDateRange();
  const query = useQuery({ queryKey: ['report-profit', from, to], queryFn: () => reportsApi.profit({ from, to }) });
  const p = query.data;
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <label className="text-xs text-gray-500">From</label>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input w-40" />
        <label className="text-xs text-gray-500">To</label>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input w-40" />
      </div>
      {p && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            ['Revenue (ex-tax)', p.revenue], ['COGS', p.cogs], ['Gross Profit', p.gross_profit],
            ['Expenses', p.expenses], ['Net Profit', p.net_profit],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="text-xs font-medium uppercase text-gray-400">{label}</div>
              <div className={`mt-1 text-xl font-bold ${Number(value) < 0 ? 'text-red-600' : 'text-gray-800'}`}>Rs. {value}</div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-gray-400">
        COGS uses each item's current cost price (invoices don't snapshot cost at sale time) — see README assumptions.
      </p>
    </div>
  );
}

function LowStockPanel() {
  const query = useQuery({ queryKey: ['report-low-stock'], queryFn: reportsApi.lowStock });
  return (
    <GenericTable
      rows={query.data || []}
      columns={[
        { key: 'item_code', label: 'Code' }, { key: 'item_name', label: 'Item' },
        { key: 'branch_qty', label: 'Qty on hand' }, { key: 'min_stock_threshold', label: 'Min threshold' },
      ]}
    />
  );
}

export function Reports() {
  const canExport = usePermission('reports.export_excel');
  const canViewCost = usePermission('purchases.view_purchase_cost');
  const canGst = usePermission('reports.view_gst_register');
  const canNonGst = usePermission('reports.view_non_gst_register');
  const canAll = usePermission('reports.view_all');
  const canCredit = usePermission('credit.view_shopwide_outstanding');
  const canProfit = usePermission('reports.view_profit');

  const tabs = [];
  if (canGst) tabs.push({ key: 'gst', label: 'GST Sales Register', content: <GstRegisterPanel canExport={canExport} /> });
  if (canNonGst) tabs.push({ key: 'non-gst', label: 'Non-GST Register', content: <NonGstRegisterPanel canExport={canExport} /> });
  if (canAll) tabs.push({ key: 'purchases', label: 'Purchase Register', content: <PurchaseRegisterPanel canExport={canExport} canViewCost={canViewCost} /> });
  if (canAll) tabs.push({ key: 'items', label: 'Item-wise Sales', content: <ItemWiseSalesPanel canExport={canExport} /> });
  if (canCredit) tabs.push({ key: 'credit', label: 'Credit Outstanding', content: <CreditOutstandingPanel /> });
  if (canAll) tabs.push({ key: 'expense-income', label: 'Expense & Income', content: <ExpenseIncomePanel canExport={canExport} /> });
  if (canProfit) tabs.push({ key: 'profit', label: 'Profit (P&L)', content: <ProfitPanel /> });
  if (canAll) tabs.push({ key: 'low-stock', label: 'Low Stock', content: <LowStockPanel /> });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-800">Reports</h1>
      {tabs.length === 0 ? <p className="text-gray-400">You don't have access to any reports.</p> : <Tabs tabs={tabs} />}
    </div>
  );
}
