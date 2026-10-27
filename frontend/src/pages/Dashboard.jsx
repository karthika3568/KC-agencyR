import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart, Package, Users, Truck, Warehouse, RotateCcw,
  Wallet, Banknote, Receipt, BarChart3, ShieldCheck, Settings as SettingsIcon,
  ClipboardList, FileText, AlertTriangle, X, Search,
  TrendingUp, AlertCircle, Sparkles, Tag, ChevronRight,
  ArrowRight, LayoutGrid, IndianRupee, PieChart
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePermission } from '../hooks/usePermission';
import { dashboardApi } from '../api/admin';
import { Card } from '../components/Card.jsx';
import { FieldSalesDashboard } from '../components/FieldSalesDashboard.jsx';

// Spatial 2D keyboard navigation helper based on DOM geometry
function findNextNavElement(currentEl, items, dir) {
  if (!currentEl || !items || items.length === 0) return null;

  const currentRect = currentEl.getBoundingClientRect();
  const cAx = currentRect.left + currentRect.width / 2;
  const cAy = currentRect.top + currentRect.height / 2;

  let bestCandidate = null;
  let bestScore = Infinity;

  for (const item of items) {
    if (item === currentEl) continue;

    const rect = item.getBoundingClientRect();
    const cBx = rect.left + rect.width / 2;
    const cBy = rect.top + rect.height / 2;

    let isValid = false;
    let score = Infinity;

    if (dir === 'ArrowRight') {
      isValid = cBx > cAx + 5 && rect.right > currentRect.right + 2;

      if (isValid) {
        const dx = Math.max(0, rect.left - currentRect.right);
        const vOverlap = Math.max(0, Math.min(currentRect.bottom, rect.bottom) - Math.max(currentRect.top, rect.top));
        const dyCenter = Math.abs(cAy - cBy);

        // Horizontal navigation stays strictly within the same horizontal visual row / band
        if (vOverlap > 0 || dyCenter < Math.max(currentRect.height, rect.height) * 0.6) {
          const topDiff = Math.abs(rect.top - currentRect.top);
          score = dx * 1.0 + topDiff * 0.2 + dyCenter * 0.2;
        } else {
          isValid = false;
        }
      }
    } else if (dir === 'ArrowLeft') {
      isValid = cBx < cAx - 5 && rect.left < currentRect.left - 2;

      if (isValid) {
        const dx = Math.max(0, currentRect.left - rect.right);
        const vOverlap = Math.max(0, Math.min(currentRect.bottom, rect.bottom) - Math.max(currentRect.top, rect.top));
        const dyCenter = Math.abs(cAy - cBy);

        // Horizontal navigation stays strictly within the same horizontal visual row / band
        if (vOverlap > 0 || dyCenter < Math.max(currentRect.height, rect.height) * 0.6) {
          const topDiff = Math.abs(rect.top - currentRect.top);
          score = dx * 1.0 + topDiff * 0.2 + dyCenter * 0.5;
        } else {
          isValid = false;
        }
      }
    } else if (dir === 'ArrowDown') {
      isValid = cBy > cAy + 10 && rect.bottom > currentRect.bottom + 5;

      if (isValid) {
        const dy = Math.max(0, rect.top - currentRect.bottom);
        const hOverlap = Math.max(0, Math.min(currentRect.right, rect.right) - Math.max(currentRect.left, rect.left));
        const dxCenter = Math.abs(cAx - cBx);
        const dxLeft = Math.abs(currentRect.left - rect.left);

        if (hOverlap > 0) {
          score = dy * 2.5 + dxLeft * 0.3 + dxCenter * 0.2;
        } else {
          const dxEdge = Math.min(Math.abs(rect.left - currentRect.right), Math.abs(currentRect.left - rect.right));
          score = dy * 2.5 + dxEdge * 1.2 + 200;
        }
      }
    } else if (dir === 'ArrowUp') {
      isValid = cBy < cAy - 10 && rect.top < currentRect.top - 5;

      if (isValid) {
        const dy = Math.max(0, currentRect.top - rect.bottom);
        const hOverlap = Math.max(0, Math.min(currentRect.right, rect.right) - Math.max(currentRect.left, rect.left));
        const dxCenter = Math.abs(cAx - cBx);
        const dxLeft = Math.abs(currentRect.left - rect.left);

        if (hOverlap > 0) {
          score = dy * 2.5 + dxLeft * 0.3 + dxCenter * 0.2;
        } else {
          const dxEdge = Math.min(Math.abs(rect.left - currentRect.right), Math.abs(currentRect.left - rect.right));
          score = dy * 2.5 + dxEdge * 1.2 + 200;
        }
      }
    }

    if (isValid && score < bestScore) {
      bestScore = score;
      bestCandidate = item;
    }
  }

  return bestCandidate;
}

const MODULES = [
  {
    to: '/pos',
    label: 'POS & Billing',
    subtitle: 'Fast barcode scanning, GST/Non-GST billing & customer checkout',
    headerTitle: 'Counter Terminal',
    perm: 'pos.access',
    icon: ShoppingCart,
    category: 'sales',
    isHero: true,
  },
  {
    to: '/catalog',
    label: 'Products',
    subtitle: 'Items & Rates',
    perm: 'catalog.manage_items',
    icon: Package,
    category: 'stock',
    iconColor: 'text-blue-600 bg-blue-50 border-blue-100',
    cornerTint: 'from-blue-50/40 via-transparent to-transparent',
  },
  {
    to: '/price-adjustment',
    label: 'Price Adjustment',
    subtitle: 'Wholesale & Retail',
    perm: 'catalog.manage_items',
    icon: Tag,
    category: 'stock',
    iconColor: 'text-purple-600 bg-purple-50 border-purple-100',
    cornerTint: 'from-purple-50/40 via-transparent to-transparent',
  },
  {
    to: '/inventory',
    label: 'Stock',
    subtitle: 'Branch Inventory',
    perm: 'inventory.view_stock',
    icon: Warehouse,
    category: 'stock',
    iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    cornerTint: 'from-emerald-50/40 via-transparent to-transparent',
  },
  {
    to: '/parties',
    label: 'Parties',
    subtitle: 'Customers & Vendors',
    perm: 'parties.manage_customers',
    icon: Users,
    category: 'sales',
    iconColor: 'text-pink-600 bg-pink-50 border-pink-100',
    cornerTint: 'from-pink-50/40 via-transparent to-transparent',
  },
  {
    to: '/purchasing',
    label: 'Purchasing',
    subtitle: 'Goods Receipt (GRN)',
    perm: 'purchases.create_grn',
    icon: Truck,
    category: 'stock',
    iconColor: 'text-cyan-600 bg-cyan-50 border-cyan-100',
    cornerTint: 'from-cyan-50/40 via-transparent to-transparent',
  },
  {
    to: '/orders',
    label: 'Orders',
    subtitle: 'Pre-bookings & Sales',
    perm: 'orders.create_prebooking',
    icon: ClipboardList,
    category: 'sales',
    iconColor: 'text-amber-600 bg-amber-50 border-amber-100',
    cornerTint: 'from-amber-50/40 via-transparent to-transparent',
  },
  {
    to: '/invoices',
    label: 'Invoices',
    subtitle: 'Sales Invoice History',
    perm: 'pos.access',
    icon: FileText,
    category: 'finance',
    iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    cornerTint: 'from-emerald-50/40 via-transparent to-transparent',
  },
  {
    to: '/collections',
    label: 'Collections',
    subtitle: 'Field Payments',
    perm: 'collections.field_collection_entry',
    icon: Wallet,
    category: 'finance',
    iconColor: 'text-sky-600 bg-sky-50 border-sky-100',
    cornerTint: 'from-sky-50/40 via-transparent to-transparent',
  },
  {
    to: '/cash-handover',
    label: 'Handover',
    subtitle: 'Cash Reconciliation',
    perm: 'handover.submit_cash_handover',
    icon: Banknote,
    category: 'finance',
    iconColor: 'text-teal-600 bg-teal-50 border-teal-100',
    cornerTint: 'from-teal-50/40 via-transparent to-transparent',
  },
  {
    to: '/expenses',
    label: 'Expenses',
    subtitle: 'Store Operating Expenses',
    perm: 'expenses.manage',
    icon: Receipt,
    category: 'finance',
    iconColor: 'text-rose-600 bg-rose-50 border-rose-100',
    cornerTint: 'from-rose-50/40 via-transparent to-transparent',
  },
  {
    to: '/returns',
    label: 'Returns',
    subtitle: 'Sales Return Slips',
    perm: 'returns.sales_return',
    icon: RotateCcw,
    category: 'sales',
    iconColor: 'text-orange-600 bg-orange-50 border-orange-100',
    cornerTint: 'from-orange-50/40 via-transparent to-transparent',
  },
  {
    to: '/reports',
    label: 'Reports',
    subtitle: 'GST, Sales & P&L',
    perm: 'reports.view_all',
    icon: BarChart3,
    category: 'finance',
    iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    cornerTint: 'from-indigo-50/40 via-transparent to-transparent',
  },
  {
    to: '/staff',
    label: 'Staff',
    subtitle: 'Permissions & Roles',
    perm: 'staff.manage_permissions',
    icon: ShieldCheck,
    category: 'admin',
    iconColor: 'text-violet-600 bg-violet-50 border-violet-100',
    cornerTint: 'from-violet-50/40 via-transparent to-transparent',
  },
  {
    to: '/settings',
    label: 'Settings',
    subtitle: 'System Config',
    perm: 'settings.manage',
    icon: SettingsIcon,
    category: 'admin',
    iconColor: 'text-slate-600 bg-slate-100 border-slate-200',
    cornerTint: 'from-slate-100/50 via-transparent to-transparent',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Modules', icon: LayoutGrid },
  { id: 'sales', label: 'Sales & Orders', icon: ShoppingCart },
  { id: 'stock', label: 'Inventory & Stock', icon: Package },
  { id: 'finance', label: 'Finance & Accounts', icon: IndianRupee },
  { id: 'admin', label: 'Admin & System', icon: SettingsIcon },
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

function StandardDashboard() {
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

  const containerRef = useRef(null);

  // Helper to retrieve all active navigable module cards inside the dashboard container
  const getCardItems = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll('[data-dashboard-card="true"]')
    ).filter((el) => {
      if (el.disabled || el.getAttribute('aria-hidden') === 'true' || el.offsetParent === null) {
        return false;
      }
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e) => {
      // Ignore if modifier keys are pressed
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // Ignore if Totals Report modal is open or focus is inside a modal dialog
      if (showTotalsReport || document.activeElement?.closest('[role="dialog"], .fixed')) {
        return;
      }

      // Ignore if focus is in an input, textarea, or editable element
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        document.activeElement?.isContentEditable
      ) {
        return;
      }

      const cardItems = getCardItems();
      const currentCard = cardItems.find(
        (item) => item === document.activeElement || item.contains(document.activeElement)
      );

      const filterButtons = Array.from(
        container.querySelectorAll('[data-dashboard-filter="true"]')
      );
      const currentFilter = filterButtons.find((btn) => btn === document.activeElement);

      const totalsBtn = container.querySelector('[data-dashboard-totals="true"]');
      const discrepancyLink = container.querySelector('[data-dashboard-discrepancy="true"]');

      // 1. If focus is on a module card
      if (currentCard) {
        // Handle Enter / Space on module cards to open the module
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          currentCard.click();
          return;
        }

        // Handle Arrow keys among module cards
        if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
          e.preventDefault();

          const nextEl = findNextNavElement(currentCard, cardItems, e.key);
          if (nextEl) {
            nextEl.focus({ preventScroll: true });
            nextEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
          } else if (e.key === 'ArrowUp') {
            // At the top row of cards: Up Arrow moves focus back to category buttons
            if (filterButtons.length > 0) {
              const lastFilter = filterButtons[filterButtons.length - 1];
              lastFilter.focus();
              lastFilter.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
            } else {
              const navDashboard = document.querySelector('[data-nav-id="dashboard"]');
              if (navDashboard) {
                navDashboard.focus();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }
          }
          return;
        }
      }

      // 2. If focus is on a category filter button
      if (currentFilter) {
        const filterIdx = filterButtons.indexOf(currentFilter);

        // Enter or Space: activate the focused category and update displayed modules
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          currentFilter.click();
          return;
        }

        if (e.key === 'ArrowRight') {
          e.preventDefault();
          const nextFilter = filterButtons[(filterIdx + 1) % filterButtons.length];
          nextFilter?.focus();
          return;
        }

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevFilter =
            filterButtons[(filterIdx - 1 + filterButtons.length) % filterButtons.length];
          prevFilter?.focus();
          return;
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (filterIdx < filterButtons.length - 1) {
            // Move sequentially to the next category button
            const nextFilter = filterButtons[filterIdx + 1];
            nextFilter?.focus();
            nextFilter?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
          } else {
            // On the last category button (Admin & System), move onward to module cards
            if (cardItems.length > 0) {
              cardItems[0].focus();
              cardItems[0].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
            }
          }
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (filterIdx > 0) {
            // Move sequentially to the previous category button
            const prevFilter = filterButtons[filterIdx - 1];
            prevFilter?.focus();
            prevFilter?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
          } else {
            // On the first category button (All Modules), move back to preceding element in Dashboard welcome section
            const precedingEl =
              discrepancyLink ||
              totalsBtn ||
              document.querySelector('[data-nav-id="dashboard"]');
            if (precedingEl) {
              precedingEl.focus();
              precedingEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
            }
          }
          return;
        }
      }

      // 3. If focus is on Totals Report button in Dashboard welcome section
      if (document.activeElement === totalsBtn) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (discrepancyLink) {
            discrepancyLink.focus();
            discrepancyLink.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
          } else if (filterButtons.length > 0) {
            filterButtons[0].focus();
            filterButtons[0].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
          } else if (cardItems.length > 0) {
            cardItems[0].focus();
            cardItems[0].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
          }
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const navDashboard = document.querySelector('[data-nav-id="dashboard"]');
          if (navDashboard) {
            navDashboard.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
          return;
        }
      }

      // 4. If focus is on discrepancy alert link in Dashboard welcome section
      if (document.activeElement === discrepancyLink) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (filterButtons.length > 0) {
            filterButtons[0].focus();
            filterButtons[0].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
          } else if (cardItems.length > 0) {
            cardItems[0].focus();
            cardItems[0].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
          }
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (totalsBtn) {
            totalsBtn.focus();
            totalsBtn.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
          } else {
            const navDashboard = document.querySelector('[data-nav-id="dashboard"]');
            if (navDashboard) {
              navDashboard.focus();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }
          return;
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [getCardItems, showTotalsReport]);

  return (
    <div ref={containerRef} className="space-y-3 sm:space-y-3.5 focus:outline-none">
      {/* 1. Welcome Banner with soft purple gradient and decorative graphic */}
      <div className="relative overflow-hidden rounded-2xl border border-[#E5E7F5]/60 bg-gradient-to-r from-[#EDE8FF] via-[#F4F0FF] to-[#EAE0FF] px-4 py-3 sm:px-5 sm:py-3.5 shadow-sm">
        <div className="relative z-10 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="max-w-xl">
            <span className="text-[10px] sm:text-xs font-bold tracking-wider text-[#6F2DA8] uppercase">
              Welcome Back,
            </span>
            <h1 className="mt-0.5 text-lg sm:text-xl lg:text-2xl font-extrabold tracking-tight text-[#17233D] flex items-center gap-1.5">
              {user?.name || 'Super Admin'} <span className="animate-wiggle">👋</span>
            </h1>
            <p className="mt-0.5 text-[11px] sm:text-xs text-[#697797] font-medium">
              Here&apos;s what&apos;s happening with your business today.
            </p>
          </div>

          {/* Quick Stats or Financials Button */}
          {canViewFinancials && (
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                data-dashboard-nav="true"
                data-dashboard-totals="true"
                onClick={() => setShowTotalsReport(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#6F2DA8] shadow-soft border border-[#DDD0FF] hover:bg-[#F7F5FF] transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#6F2DA8] focus:ring-offset-2"
              >
                <PieChart size={14} />
                <span>Totals Report</span>
              </button>
            </div>
          )}
        </div>

        {/* Decorative Graphic Element on the right matching the reference screenshot */}
        <div className="pointer-events-none absolute right-4 bottom-1 hidden lg:flex items-end gap-3 opacity-90 select-none">
          {/* Laptop & Documents Vector Graphic */}
          <div className="relative w-44 h-22">
            <svg viewBox="0 0 260 140" fill="none" className="w-full h-full">
              {/* Plant in pot */}
              <circle cx="28" cy="100" r="14" fill="#8244AD" fillOpacity="0.15" />
              <path d="M28 85 C22 75, 20 65, 26 58 C32 65, 30 75, 28 85 Z" fill="#6F2DA8" />
              <path d="M28 85 C34 75, 38 68, 42 66 C42 74, 36 80, 28 85 Z" fill="#8244AD" />
              <path d="M22 100 L34 100 L32 120 L24 120 Z" fill="#6F2DA8" />

              {/* Laptop base & screen */}
              <rect x="55" y="25" width="130" height="85" rx="8" fill="#351442" stroke="#6F2DA8" strokeWidth="2" />
              <rect x="62" y="32" width="116" height="71" rx="4" fill="#F8F5FF" />
              {/* Screen chart elements */}
              <rect x="75" y="75" width="10" height="20" rx="2" fill="#8244AD" />
              <rect x="90" y="60" width="10" height="35" rx="2" fill="#6F2DA8" />
              <rect x="105" y="70" width="10" height="25" rx="2" fill="#DDD0FF" />
              <rect x="120" y="50" width="10" height="45" rx="2" fill="#6F2DA8" />
              <path d="M72 65 Q 95 40, 140 45" stroke="#8244AD" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <polygon points="50,112 190,112 175,118 65,118" fill="#351442" />

              {/* Document sheet */}
              <rect x="155" y="45" width="55" height="70" rx="6" fill="#FFFFFF" stroke="#DDD0FF" strokeWidth="1.5" />
              <line x1="165" y1="58" x2="195" y2="58" stroke="#8244AD" strokeWidth="3" strokeLinecap="round" />
              <line x1="165" y1="68" x2="200" y2="68" stroke="#E5E7F5" strokeWidth="2" strokeLinecap="round" />
              <line x1="165" y1="76" x2="190" y2="76" stroke="#E5E7F5" strokeWidth="2" strokeLinecap="round" />
              <rect x="165" y="85" width="22" height="20" rx="3" fill="#EDE5FF" />
            </svg>
          </div>

          {/* "Grow Together" Cursive Text Badge */}
          <div className="mb-3 mr-2 flex flex-col items-center">
            <span className="font-serif italic text-sm font-bold text-[#6F2DA8] tracking-wide rotate-[-4deg]">
              Grow Together
            </span>
            <svg width="50" height="10" viewBox="0 0 70 12" fill="none">
              <path d="M2 9 C 25 2, 45 12, 68 4" stroke="#8244AD" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Discrepancy Alert Banner if needed */}
      {canViewFinancials && summary && summary.unresolved_handover_discrepancies?.length > 0 && (
        <Card className="border-rose-200 bg-rose-50/80 p-2.5 rounded-xl text-rose-800">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold text-rose-700">
              <AlertTriangle size={16} />
              <span>{summary.unresolved_handover_discrepancies.length} unresolved cash handover discrepancy</span>
            </div>
            <Link
              to="/cash-handover"
              data-dashboard-nav="true"
              data-dashboard-discrepancy="true"
              className="font-bold text-rose-800 underline hover:text-rose-950 focus:outline-none focus:ring-2 focus:ring-rose-600 focus:ring-offset-2 rounded"
            >
              Resolve now →
            </Link>
          </div>
        </Card>
      )}

      {/* 2. Category Filter Pills Bar */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 text-xs">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              data-dashboard-nav="true"
              data-dashboard-filter="true"
              onClick={() => setSelectedCategory(cat.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap border focus:outline-none focus:ring-2 focus:ring-[#6F2DA8] focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#6F2DA8] focus-visible:ring-offset-2 focus:border-[#6F2DA8] ${
                isActive
                  ? 'bg-[#351442] text-white border-[#351442] shadow-sm font-semibold'
                  : 'bg-white text-[#6F5B85] border-[#DDD0FF] hover:bg-[#FAF8FF] hover:border-[#C4B5FD] hover:text-[#5C238C] font-medium'
              }`}
            >
              <Icon size={13} className={isActive ? 'text-white' : 'text-[#6F5B85]'} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Responsive Module Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {filteredModules.map((item) => {
          const allowed = usePermission(item.perm);
          if (!allowed) return null;
          const Icon = item.icon;

          // Hero POS & Billing Card (Wide prominent card matching reference)
          if (item.isHero) {
            return (
              <div
                key={item.to}
                data-dashboard-card="true"
                data-dashboard-nav="true"
                tabIndex={0}
                role="button"
                aria-label={`${item.label} - ${item.headerTitle}`}
                onClick={() => navigate(item.to)}
                className="group relative cursor-pointer col-span-1 sm:col-span-2 md:col-span-2 lg:col-span-2 row-span-2 rounded-2xl border border-[#DDD0FF] bg-gradient-to-br from-[#EDE8FF] via-[#F8F5FF] to-white p-3.5 sm:p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-soft-md active:scale-[0.99] flex flex-col justify-between overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#6F2DA8] focus:ring-offset-2 focus:border-[#6F2DA8] focus-visible:ring-2 focus-visible:ring-[#6F2DA8] focus-visible:ring-offset-2 focus:shadow-md"
              >
                {/* Background subtle glow */}
                <div className="pointer-events-none absolute -right-10 -bottom-10 h-36 w-36 rounded-full bg-primary/5 blur-xl transition-transform group-hover:scale-125" />

                {/* Top: Icon + Badge */}
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DDD0FF]/80 text-[#6F2DA8] shadow-sm transition-transform group-hover:scale-105">
                    <ShoppingCart size={18} />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#DDD0FF] bg-white/90 px-2.5 py-0.5 text-[10px] font-bold text-[#6F2DA8] shadow-sm">
                    <Sparkles size={11} className="text-[#6F2DA8]" />
                    Primary Module
                  </span>
                </div>

                {/* Middle Content */}
                <div className="my-2 sm:my-2.5 relative z-10">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6F2DA8]">
                    {item.headerTitle}
                  </span>
                  <h2 className="mt-0.5 text-lg sm:text-xl font-extrabold text-[#17233D] group-hover:text-[#6F2DA8] transition-colors leading-tight">
                    {item.label}
                  </h2>
                  <p className="mt-1 text-[11px] sm:text-xs text-[#697797] font-medium leading-relaxed max-w-xs line-clamp-2">
                    {item.subtitle}
                  </p>
                </div>

                {/* Bottom: Action Button + POS Screen Graphic */}
                <div className="flex items-end justify-between relative z-10 gap-2">
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label="Launch Counter Terminal"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(item.to);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#6F2DA8] px-3.5 py-1.5 text-xs font-bold text-white shadow-soft transition-all hover:bg-[#5C238C] active:scale-95 shrink-0"
                  >
                    <span>Launch Counter Terminal</span>
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                  </button>

                  {/* Terminal monitor illustration on right */}
                  <div className="hidden sm:block pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                    <svg width="65" height="48" viewBox="0 0 100 80" fill="none">
                      <rect x="10" y="5" width="80" height="55" rx="6" fill="#351442" />
                      <rect x="15" y="10" width="70" height="45" rx="3" fill="#EDE8FF" />
                      {/* Scanner frame */}
                      <rect x="25" y="18" width="18" height="18" rx="3" stroke="#8244AD" strokeWidth="1.5" strokeDasharray="3 3" />
                      {/* Barcode bars */}
                      <line x1="28" y1="23" x2="28" y2="31" stroke="#351442" strokeWidth="1.5" />
                      <line x1="32" y1="23" x2="32" y2="31" stroke="#351442" strokeWidth="1" />
                      <line x1="35" y1="23" x2="35" y2="31" stroke="#351442" strokeWidth="2" />
                      <line x1="39" y1="23" x2="39" y2="31" stroke="#351442" strokeWidth="1" />
                      {/* Chart lines */}
                      <path d="M50 42 L60 30 L70 36 L78 22" stroke="#6F2DA8" strokeWidth="2" strokeLinecap="round" />
                      {/* Stand */}
                      <polygon points="44,60 56,60 54,72 46,72" fill="#351442" />
                      <rect x="36" y="72" width="28" height="4" rx="2" fill="#351442" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          }

          // Standard Module Card
          return (
            <div
              key={item.to}
              data-dashboard-card="true"
              data-dashboard-nav="true"
              tabIndex={0}
              role="button"
              aria-label={`${item.label} - ${item.subtitle}`}
              onClick={() => navigate(item.to)}
              className="group relative cursor-pointer rounded-xl sm:rounded-2xl border border-border-soft bg-white p-2.5 sm:p-3 shadow-sm transition-all hover:border-primary/40 hover:shadow-soft-md active:scale-95 flex flex-col justify-between min-h-[76px] sm:min-h-[82px] overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#6F2DA8] focus:ring-offset-2 focus:border-[#6F2DA8] focus-visible:ring-2 focus-visible:ring-[#6F2DA8] focus-visible:ring-offset-2 focus:shadow-md"
            >
              {/* Subtle corner tint gradient matching reference */}
              <div
                className={`pointer-events-none absolute right-0 bottom-0 h-16 w-16 rounded-tl-full bg-gradient-to-tl ${item.cornerTint}`}
              />

              {/* Card Header: Icon + Arrow */}
              <div className="relative z-10 flex items-center justify-between">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border ${item.iconColor} shadow-xs transition-transform group-hover:scale-105`}
                >
                  <Icon size={16} />
                </div>
                <ChevronRight
                  size={14}
                  className="text-ink-light transition-all group-hover:translate-x-0.5 group-hover:text-primary"
                />
              </div>

              {/* Card Footer: Title + Subtitle */}
              <div className="relative z-10 mt-1.5">
                <h3 className="text-xs sm:text-[13px] font-bold text-ink group-hover:text-primary transition-colors truncate leading-tight">
                  {item.label}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-ink-muted truncate mt-0.5">
                  {item.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Totals Report Modal */}
      {canViewFinancials && showTotalsReport && summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 sm:p-7 text-ink shadow-soft-lg space-y-5 border border-border-soft">
            <div className="flex items-center justify-between border-b border-border-soft pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary border border-lavender-300">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-ink">
                    Financial Summary Report
                  </h2>
                  <p className="text-xs text-ink-muted">
                    Real-time revenue, purchase &amp; outstanding overview
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTotalsReport(false)}
                className="rounded-xl p-2 text-ink-light hover:bg-lavender-100 hover:text-ink transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 max-h-[60vh] overflow-y-auto pr-1">
              {SUMMARY_METRICS.map((c) => (
                <div
                  key={c.key}
                  className={`rounded-2xl border p-4 ${
                    c.highlight
                      ? 'border-lavender-300 bg-primary-soft/40 text-primary'
                      : 'border-border-soft bg-lavender-50/50 text-ink'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    {c.label}
                  </div>
                  <div className="mt-1 text-base font-extrabold text-ink">
                    Rs. {summary[c.key] ?? '0.00'}
                  </div>
                </div>
              ))}

              <div
                className={`rounded-2xl border p-4 ${
                  summary.low_stock_count > 0
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-border-soft bg-lavender-50/50'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  Low Stock Alerts
                </div>
                <div className="mt-1 text-base font-extrabold text-ink flex items-center gap-1.5">
                  {summary.low_stock_count} item(s)
                  {summary.low_stock_count > 0 && <AlertCircle className="h-4 w-4 text-amber-600" />}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-border-soft">
              <Link
                to="/reports"
                onClick={() => setShowTotalsReport(false)}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                Open Detailed Reports Page →
              </Link>
              <button
                onClick={() => setShowTotalsReport(false)}
                className="rounded-xl bg-sidebar px-4 py-2 text-xs font-bold text-white hover:bg-black transition-colors"
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

export function Dashboard() {
  const { user } = useAuth();

  if (user?.role === 'Field Sales Executive') {
    return <FieldSalesDashboard />;
  }

  return <StandardDashboard />;
}
