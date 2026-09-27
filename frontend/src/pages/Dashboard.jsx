import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart, Package, Users, Truck, Warehouse, RotateCcw,
  Wallet, Banknote, Receipt, BarChart3, ShieldCheck, Settings as SettingsIcon,
  Building2, ClipboardList, FileText, AlertTriangle, X, Search,
  PieChart, TrendingUp, AlertCircle, ArrowUpRight, Zap, Sparkles, Tag
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePermission } from '../hooks/usePermission';
import { dashboardApi } from '../api/admin';
import { Card } from '../components/Card.jsx';

const MODULES = [
  {
    to: '/pos',
    label: 'POS & Billing',
    subtitle: 'Quick Sales & Counter Billing',
    perm: 'pos.access',
    icon: ShoppingCart,
    category: 'sales',
    isHero: true,
    iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  },
  {
    to: '/catalog',
    label: 'Products',
    subtitle: 'Items & Rates',
    perm: 'catalog.manage_items',
    icon: Package,
    category: 'stock',
    iconColor: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    to: '/price-adjustment',
    label: 'Price Adjustment',
    subtitle: 'Wholesale & Retail',
    perm: 'catalog.manage_items',
    icon: Tag,
    category: 'stock',
    iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  },
  {
    to: '/inventory',
    label: 'Stock',
    subtitle: 'Branch Inventory',
    perm: 'inventory.view_stock',
    icon: Warehouse,
    category: 'stock',
    iconColor: 'text-teal-600 bg-teal-50 border-teal-200',
  },
  {
    to: '/parties',
    label: 'Parties',
    subtitle: 'Customers & Vendors',
    perm: 'parties.manage_customers',
    icon: Users,
    category: 'sales',
    iconColor: 'text-purple-600 bg-purple-50 border-purple-200',
  },
  {
    to: '/purchasing',
    label: 'Purchasing',
    subtitle: 'Goods Receipt (GRN)',
    perm: 'purchases.create_grn',
    icon: Truck,
    category: 'stock',
    iconColor: 'text-sky-600 bg-sky-50 border-sky-200',
  },
  {
    to: '/orders',
    label: 'Orders',
    subtitle: 'Pre-bookings & Sales',
    perm: 'orders.create_prebooking',
    icon: ClipboardList,
    category: 'sales',
    iconColor: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  {
    to: '/invoices',
    label: 'Invoices',
    subtitle: 'Sales Invoice History',
    perm: 'pos.access',
    icon: FileText,
    category: 'finance',
    iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    to: '/collections',
    label: 'Collections',
    subtitle: 'Field Payments',
    perm: 'collections.field_collection_entry',
    icon: Wallet,
    category: 'finance',
    iconColor: 'text-cyan-600 bg-cyan-50 border-cyan-200',
  },
  {
    to: '/cash-handover',
    label: 'Handover',
    subtitle: 'Cash Reconciliation',
    perm: 'handover.submit_cash_handover',
    icon: Banknote,
    category: 'finance',
    iconColor: 'text-green-700 bg-green-50 border-green-200',
  },
  {
    to: '/expenses',
    label: 'Expenses',
    subtitle: 'Store Operating Expenses',
    perm: 'expenses.manage',
    icon: Receipt,
    category: 'finance',
    iconColor: 'text-rose-600 bg-rose-50 border-rose-200',
  },
  {
    to: '/returns',
    label: 'Returns',
    subtitle: 'Sales Return Slips',
    perm: 'returns.sales_return',
    icon: RotateCcw,
    category: 'sales',
    iconColor: 'text-orange-600 bg-orange-50 border-orange-200',
  },
  {
    to: '/reports',
    label: 'Reports',
    subtitle: 'GST, Sales & P&L',
    perm: 'reports.view_all',
    icon: BarChart3,
    category: 'finance',
    iconColor: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  {
    to: '/staff',
    label: 'Staff',
    subtitle: 'Permissions & Roles',
    perm: 'staff.manage_permissions',
    icon: ShieldCheck,
    category: 'admin',
    iconColor: 'text-violet-600 bg-violet-50 border-violet-200',
  },
  {
    to: '/settings',
    label: 'Settings',
    subtitle: 'System Config',
    perm: 'settings.manage',
    icon: SettingsIcon,
    category: 'admin',
    iconColor: 'text-slate-700 bg-slate-100 border-slate-300',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Modules' },
  { id: 'sales', label: 'Sales & Orders' },
  { id: 'stock', label: 'Inventory & Stock' },
  { id: 'finance', label: 'Finance & Accounts' },
  { id: 'admin', label: 'Admin & System' },
];

const SUMMARY_METRICS = [
  { key: 'today_sales_revenue', label: "Today's Sales Revenue", highlight: true },
  { key: 'month_sales_total', label: 'Monthly Sales Total' },
  { key: 'today_purchases', label: "Today's Purchases" },
  { key: 'month_purchases_total', label: 'Monthly Purchases Total' },
  { key: 'inventory_valuation', label: 'Inventory Valuation' },
  { key: 'customer_net_outstanding', label: 'Customer Net Outstanding' },
  { key: 'supplier_net_outstanding', label: 'Supplier Net Outstanding' },
  { key: 'employee_collections_today', label: 'Collections Today' },
  { key: 'operating_expenses_today', label: 'Expenses Today' },
  { key: 'extra_income_today', label: 'Extra Income Today' },
];

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canViewFinancials = usePermission('dashboard.view_financial_summary');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showTotalsReport, setShowTotalsReport] = useState(false);

  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.summary,
    enabled: canViewFinancials,
  });
  const summary = summaryQuery.data;

  // Filter modules based on search & category
  const filteredModules = useMemo(() => {
    return MODULES.filter((m) => {
      const matchesSearch =
        m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] justify-between overflow-hidden gap-3 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border-soft pb-2.5 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Welcome, <span className="font-semibold text-slate-800">{user?.name}</span> ({user?.role})
          </p>
        </div>

        {/* Search & Totals Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border-soft bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {canViewFinancials && (
            <button
              onClick={() => setShowTotalsReport(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 shadow-xs hover:bg-blue-100 transition-all active:scale-95 shrink-0"
            >
              <PieChart size={15} />
              <span className="hidden sm:inline">Totals Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs shrink-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
              selectedCategory === cat.id
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-border-soft hover:bg-slate-100'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Discrepancy Alert Banner */}
      {canViewFinancials && summary && summary.unresolved_handover_discrepancies?.length > 0 && (
        <Card className="border-red-200 bg-red-50 p-2.5 rounded-xl text-red-800 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold text-red-600">
              <AlertTriangle size={16} />
              {summary.unresolved_handover_discrepancies.length} unresolved cash handover discrepancy
            </div>
            <Link to="/cash-handover" className="font-bold text-red-700 underline hover:text-red-900">
              Resolve →
            </Link>
          </div>
        </Card>
      )}

      {/* Transparent Cards Grid (No background fill on cards, color on icons only) */}
      <div className="flex-1 flex flex-col justify-center my-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6 gap-2.5 sm:gap-3">
          {/* Standard Module Cards Grid */}
          {filteredModules.map((item) => {
            const allowed = usePermission(item.perm);
            if (!allowed) return null;
            const Icon = item.icon;

            // Hero POS Card (Transparent border card, colorful icon badge)
            if (item.isHero) {
              return (
                <div
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className="group col-span-2 row-span-2 cursor-pointer relative rounded-2xl border border-black bg-white p-4 text-slate-900 shadow-sm transition-all hover:border-black hover:shadow-md active:scale-[0.99] flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 transition-transform group-hover:scale-110">
                      <ShoppingCart size={24} />
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600 border border-indigo-100">
                      <Sparkles size={11} />
                      Primary Module
                    </span>
                  </div>

                  <div className="mt-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                      Counter Terminal
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      POS &amp; Billing
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500 font-medium line-clamp-2">
                      Fast barcode scanning, GST/Non-GST billing &amp; customer checkout
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 text-xs font-bold text-indigo-600">
                    <span>Launch Counter Terminal</span>
                    <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              );
            }

            // Standard Module Card (Clean transparent white card, colorful icon badge)
            return (
              <div
                key={item.to}
                onClick={() => navigate(item.to)}
                className="group cursor-pointer rounded-2xl border border-black bg-white p-3 text-slate-900 shadow-2xs transition-all hover:border-black hover:shadow-md active:scale-95 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.iconColor} transition-transform group-hover:scale-105`}>
                    <Icon size={18} />
                  </div>
                  <ArrowUpRight size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="mt-2">
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-black transition-colors truncate">
                    {item.label}
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Totals Report Modal */}
      {canViewFinancials && showTotalsReport && summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 text-slate-900 shadow-2xl space-y-5 border border-border-soft">
            <div className="flex items-center justify-between border-b border-border-soft pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-wide text-slate-900">Financial Summary Report</h2>
                  <p className="text-xs text-slate-500">Real-time revenue, purchase &amp; outstanding overview</p>
                </div>
              </div>
              <button
                onClick={() => setShowTotalsReport(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 max-h-[60vh] overflow-y-auto pr-1">
              {SUMMARY_METRICS.map((c) => (
                <div
                  key={c.key}
                  className={`rounded-2xl border border-black p-3.5 ${
                    c.highlight
                      ? 'bg-indigo-50/50 text-indigo-900'
                      : 'bg-slate-50/60 text-slate-800'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{c.label}</div>
                  <div className="mt-1 text-base font-extrabold text-slate-900">
                    Rs. {summary[c.key] ?? '0.00'}
                  </div>
                </div>
              ))}

              <div
                className={`rounded-2xl border border-black p-3.5 ${
                  summary.low_stock_count > 0
                    ? 'bg-amber-50 text-amber-900'
                    : 'bg-slate-50/60'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Low Stock Alerts</div>
                <div className="mt-1 text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                  {summary.low_stock_count} item(s)
                  {summary.low_stock_count > 0 && <AlertCircle className="h-4 w-4 text-amber-600" />}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-border-soft">
              <Link
                to="/reports"
                onClick={() => setShowTotalsReport(false)}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                Open Detailed Reports Page <ArrowUpRight size={14} />
              </Link>
              <button
                onClick={() => setShowTotalsReport(false)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-black"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




