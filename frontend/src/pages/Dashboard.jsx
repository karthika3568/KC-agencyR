import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePermission } from '../hooks/usePermission';
import { dashboardApi } from '../api/admin';
import { Card } from '../components/Card.jsx';

const CARDS = [
  { key: 'today_sales_revenue', label: "Today's Sales Revenue", highlight: true },
  { key: 'month_sales_total', label: 'Monthly Sales Total' },
  { key: 'today_purchases', label: "Today's Purchases" },
  { key: 'month_purchases_total', label: 'Monthly Purchases Total' },
  { key: 'inventory_valuation', label: 'Inventory Valuation' },
  { key: 'customer_net_outstanding', label: 'Customer Net Outstanding' },
  { key: 'supplier_net_outstanding', label: 'Supplier Net Outstanding' },
  { key: 'employee_collections_today', label: 'Collections Today' },
  { key: 'operating_expenses_today', label: 'Operating Expenses Today' },
  { key: 'extra_income_today', label: 'Extra Income Today' },
];

export function Dashboard() {
  const { user } = useAuth();
  const canViewFinancials = usePermission('dashboard.view_financial_summary');
  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.summary,
    enabled: canViewFinancials,
  });

  const summary = summaryQuery.data;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-ink">Dashboard</h1>
      <p className="mb-4 text-sm text-ink-muted">
        Welcome, {user?.name} · {user?.role}
      </p>

      {!canViewFinancials && (
        <p className="text-ink-muted">You don't have access to the financial summary.</p>
      )}

      {canViewFinancials && summary && summary.unresolved_handover_discrepancies?.length > 0 && (
        <Card className="mb-4 border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 font-semibold text-danger">
            <AlertTriangle size={18} />
            {summary.unresolved_handover_discrepancies.length} unresolved cash handover discrepanc
            {summary.unresolved_handover_discrepancies.length === 1 ? 'y' : 'ies'}
          </div>
          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {summary.unresolved_handover_discrepancies.map((d) => (
              <li key={d.handover_no}>
                {d.handover_no} — {d.employee_name}: submitted Rs. {d.submitted_amount}, verified Rs. {d.verified_amount}
                {' '}(short by Rs. {Math.abs(Number(d.discrepancy)).toFixed(2)}) on {d.handover_date}
              </li>
            ))}
          </ul>
          <a href="/cash-handover" className="mt-2 inline-block text-sm font-medium text-danger underline">
            Go to Cash Handover →
          </a>
        </Card>
      )}

      {canViewFinancials && summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {CARDS.map((c) => (
            <div
              key={c.key}
              className={`rounded-xl border p-4 ${c.highlight ? 'border-gold/30 bg-highlight' : 'card'}`}
            >
              <div className="text-xs font-medium uppercase text-ink-muted">{c.label}</div>
              <div className="mt-1 text-xl font-bold text-ink">Rs. {summary[c.key]}</div>
            </div>
          ))}
          <div className={`rounded-xl border p-4 ${summary.low_stock_count > 0 ? 'border-warning/30 bg-warning-bg' : 'card'}`}>
            <div className="text-xs font-medium uppercase text-ink-muted">Low Stock Alerts</div>
            <div className="mt-1 text-xl font-bold text-ink">{summary.low_stock_count} item(s)</div>
          </div>
        </div>
      )}
    </div>
  );
}
