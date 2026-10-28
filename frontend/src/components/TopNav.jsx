import { useEffect, useState, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Menu, Search, MapPin, ChevronDown, LogOut,
  X, Check, ShieldCheck, User, LayoutDashboard,
  ShoppingBag, Boxes, Landmark, SlidersHorizontal,
  BarChart3, ShoppingCart, FileText, Users,
  ClipboardList, RotateCcw, Package, Warehouse,
  Tag, Wallet, Receipt, Banknote, Settings as SettingsIcon,
  Sparkles, Truck, History
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePermission } from '../hooks/usePermission';
import { useBranchStore } from '../store/branchStore';
import { branchesApi } from '../api/branches';

// Helper to check user permissions
function checkPermission(user, perm, targetPath = null) {
  if (user?.role === 'Field Sales Executive' && targetPath === '/pos') {
    return false;
  }
  if (!perm) return false;
  if (!user || !user.permissions) return false;
  if (Array.isArray(perm)) {
    return perm.some((p) => user.permissions.includes(p));
  }
  return Boolean(user.permissions.includes(perm));
}

// Helper to determine if a section is active
export function isSectionActive(sec, currentPath) {
  if (!sec || !currentPath) return false;
  if (sec.exact) {
    return currentPath === sec.to;
  }
  if (sec.matchPaths) {
    return sec.matchPaths.some(
      (p) => currentPath === p || currentPath.startsWith(p + '/')
    );
  }
  return currentPath === sec.to || currentPath.startsWith(sec.to + '/');
}
// Module search catalog with permission gating
const ALL_MODULE_SEARCH = [
  { to: '/', label: 'Dashboard', desc: 'Overview & metrics', perm: 'dashboard.view_financial_summary' },
  { to: '/pos', label: 'POS & Billing', desc: 'Counter sales & checkout', perm: 'pos.access' },
  { to: '/catalog', label: 'Products & Catalog', desc: 'Item master & prices', perm: 'catalog.manage_items' },
  { to: '/price-adjustment', label: 'Price Adjustment', desc: 'Wholesale & retail pricing', perm: ['catalog.manage_price_lists', 'catalog.manage_price_rules', 'catalog.manage_items'] },
  { to: '/parties', label: 'Parties', desc: 'Customers & suppliers', perm: ['parties.manage_customers', 'parties.manage_suppliers'] },
  { to: '/purchasing', label: 'Purchasing (GRN)', desc: 'Goods receipts & vendor bills', perm: ['purchases.create_grn', 'purchases.edit_grn', 'purchases.view_purchase_cost', 'purchases.settle_supplier_payment'] },
  { to: '/orders', label: 'Orders & Indents', desc: 'Pre-bookings & purchase requests', perm: ['orders.create_prebooking', 'orders.create_purchase_indent', 'orders.approve_purchase_request', 'orders.manage_prebooking_status', 'orders.view_prebooking'] },
  { to: '/inventory', label: 'Inventory & Stock', desc: 'Branch stock levels & batches', perm: ['inventory.view_stock', 'inventory.stock_adjustment', 'inventory.issue_van_stock'] },
  { to: '/returns', label: 'Returns', desc: 'Sales & customer returns', perm: ['returns.sales_return', 'returns.purchase_return', 'returns.approve_untraceable_return'] },
  { to: '/invoices', label: 'Invoices', desc: 'Sales invoice history', perm: 'pos.access' },
  { to: '/collections', label: 'Collections', desc: 'Field payment entries', perm: ['collections.field_collection_entry', 'credit.collect_credit_payment', 'credit.view_shopwide_outstanding'] },
  { to: '/cash-handover', label: 'Cash Handover', desc: 'Shift reconciliation', perm: ['handover.submit_cash_handover', 'handover.verify_reconcile'] },
  { to: '/expenses', label: 'Expenses', desc: 'Operating costs & receipts', perm: 'expenses.manage' },
  { to: '/reports', label: 'Reports', desc: 'GST, Sales, P&L', perm: ['reports.view_all', 'reports.view_gst_register', 'reports.view_non_gst_register', 'reports.view_profit', 'reports.export_excel'] },
  { to: '/staff', label: 'Staff & Roles', desc: 'Team & access permissions', perm: ['staff.manage_accounts', 'staff.manage_permissions'] },
  { to: '/settings', label: 'Settings', desc: 'System configuration', perm: ['settings.manage', 'branches.manage'] },
];

// Navigation structure
const TOP_NAV_GROUPS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    to: '/',
    perm: 'dashboard.view_financial_summary',
    icon: LayoutDashboard,
    isDirect: true,
  },
  {
    id: 'sales-customers',
    label: 'Sales & Customers',
    icon: ShoppingBag,
    items: [
      { to: '/pos', label: 'Billing / POS', desc: 'Counter sales & instant checkout', perm: 'pos.access', icon: FileText },
      { to: '/parties', label: 'Parties', desc: 'Customers & supplier directory', perm: ['parties.manage_customers', 'parties.manage_suppliers'], icon: Users },
      {
        to: '/orders',
        label: 'Orders & Indents',
        desc: 'Pre-bookings & purchase requests',
        perm: [
          'orders.create_prebooking',
          'orders.create_purchase_indent',
          'orders.approve_purchase_request',
          'orders.manage_prebooking_status',
          'orders.view_prebooking',
        ],
        icon: ClipboardList,
      },
      { to: '/returns', label: 'Returns', desc: 'Sales & customer return slips', perm: ['returns.sales_return', 'returns.purchase_return', 'returns.approve_untraceable_return'], icon: RotateCcw },
    ],
  },
  {
    id: 'products-inventory',
    label: 'Products & Inventory',
    icon: Boxes,
    items: [
      { to: '/catalog', label: 'Catalog', desc: 'Item master, rates & barcodes', perm: 'catalog.manage_items', icon: Package },
      { to: '/inventory', label: 'Stock & Inventory', desc: 'Branch stock levels & batches', perm: ['inventory.view_stock', 'inventory.stock_adjustment', 'inventory.issue_van_stock'], icon: Warehouse },
      { to: '/purchasing', label: 'Purchasing (GRN)', desc: 'Goods receipts & vendor bills', perm: ['purchases.create_grn', 'purchases.edit_grn', 'purchases.view_purchase_cost', 'purchases.settle_supplier_payment'], icon: ShoppingCart },
      { to: '/price-adjustment', label: 'Price Adjustment', desc: 'Wholesale & retail price changes', perm: ['catalog.manage_price_lists', 'catalog.manage_price_rules', 'catalog.manage_items'], icon: Tag },
    ],
  },
  {
    id: 'finance-accounts',
    label: 'Finance & Accounts',
    icon: Landmark,
    items: [
      { to: '/invoices', label: 'Invoices', desc: 'Sales invoice history & print', perm: 'pos.access', icon: FileText },
      { to: '/collections', label: 'Collections', desc: 'Field payment collections', perm: ['collections.field_collection_entry', 'credit.collect_credit_payment', 'credit.view_shopwide_outstanding'], icon: Wallet },
      { to: '/expenses', label: 'Expenses', desc: 'Store operational expense vouchers', perm: 'expenses.manage', icon: Receipt },
      { to: '/cash-handover', label: 'Cash Handover', desc: 'Shift cash drawer reconciliation', perm: ['handover.submit_cash_handover', 'handover.verify_reconcile'], icon: Banknote },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    to: '/reports',
    perm: ['reports.view_all', 'reports.view_gst_register', 'reports.view_non_gst_register', 'reports.view_profit', 'reports.export_excel'],
    icon: BarChart3,
    isDirect: true,
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: SlidersHorizontal,
    items: [
      { to: '/staff', label: 'Staff & Roles', desc: 'Team users & access permissions', perm: ['staff.manage_accounts', 'staff.manage_permissions'], icon: ShieldCheck },
      { to: '/settings', label: 'Settings', desc: 'System configuration & preferences', perm: ['settings.manage', 'branches.manage'], icon: SettingsIcon },
    ],
  },
];

export const TOP_NAV_GROUPS_LIST = TOP_NAV_GROUPS;
export const TOP_NAV_SECTIONS = TOP_NAV_GROUPS;
export { TOP_NAV_GROUPS };

export function TopNav({ onToggleSidebar, onToggleMobile } = {}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const canSwitch = usePermission('branches.switch_context');
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const profileRef = useRef(null);
  const searchRef = useRef(null);
  const navRef = useRef(null);
  const pendingFocusRef = useRef(null);

  // Helper to get all rendered, visible top-level navbar interactive items in DOM order
  const getTopLevelItems = () => {
    if (!navRef.current) return [];
    return Array.from(navRef.current.querySelectorAll('[data-nav-top="true"]')).filter((el) => {
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
      const s = window.getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && el.offsetWidth > 0 && el.offsetHeight > 0;
    });
  };

  // Helper to get all enabled, visible interactive items in a dropdown
  const getDropdownItems = (dropdownEl) => {
    if (!dropdownEl) return [];
    return Array.from(dropdownEl.querySelectorAll('a, button, [role="menuitem"]')).filter((el) => {
      if (
        el.disabled ||
        el.getAttribute('aria-disabled') === 'true' ||
        el.hasAttribute('disabled') ||
        el.getAttribute('data-disabled') === 'true'
      ) {
        return false;
      }
      const s = window.getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') {
        return false;
      }
      if (el.offsetWidth === 0 && el.offsetHeight === 0) {
        return false;
      }
      return true;
    });
  };

  // Focus a dropdown item ('first' or 'last')
  const focusDropdownItem = (groupId, direction = 'first') => {
    const dropdownEl = navRef.current?.querySelector(`[data-nav-dropdown="${groupId}"]`);
    if (!dropdownEl) return;
    const items = getDropdownItems(dropdownEl);
    if (items.length > 0) {
      const target = direction === 'last' ? items[items.length - 1] : items[0];
      target.focus();
    }
  };

  // When a dropdown opens and pending focus is queued, focus after render
  useEffect(() => {
    if (openDropdownId && pendingFocusRef.current) {
      const direction = pendingFocusRef.current;
      pendingFocusRef.current = null;
      requestAnimationFrame(() => {
        focusDropdownItem(openDropdownId, direction);
      });
    }
  }, [openDropdownId]);

  // On mount / page load, ensure the active navbar item has DOM focus so immediate arrow key navigation works
  useEffect(() => {
    const timer = setTimeout(() => {
      if (document.activeElement === document.body || !document.activeElement) {
        const topItems = getTopLevelItems();
        if (topItems.length > 0) {
          const activeItem =
            topItems.find((el) => {
              const navId = el.getAttribute('data-nav-id') || el.getAttribute('data-group-id');
              if (navId === 'dashboard' && location.pathname === '/') return true;
              return el.classList.contains('font-bold') || el.getAttribute('aria-current') === 'page';
            }) || topItems[0];
          activeItem?.focus();
        }
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Global Arrow navigation fallback: if focus is on document.body, ArrowRight/Left navigates the navbar
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.defaultPrevented) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'ArrowDown') return;

      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        document.activeElement?.isContentEditable
      ) {
        return;
      }

      if (
        document.activeElement === document.body ||
        document.activeElement === document.documentElement
      ) {
        if (e.key === 'ArrowDown' && location.pathname === '/') {
          const firstTarget =
            document.querySelector('[data-dashboard-totals="true"]') ||
            document.querySelector('[data-dashboard-discrepancy="true"]') ||
            document.querySelector('[data-dashboard-filter="true"]') ||
            document.querySelector('[data-dashboard-card="true"]') ||
            document.querySelector('[data-dashboard-nav="true"]');
          if (firstTarget) {
            e.preventDefault();
            firstTarget.focus();
            firstTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
            return;
          }
        }

        const topItems = getTopLevelItems();
        if (topItems.length === 0) return;

        let activeIdx = topItems.findIndex((el) => {
          const navId = el.getAttribute('data-nav-id') || el.getAttribute('data-group-id');
          if (navId === 'dashboard' && location.pathname === '/') return true;
          return el.classList.contains('font-bold') || el.getAttribute('aria-current') === 'page';
        });
        if (activeIdx === -1) activeIdx = 0;

        if (e.key === 'ArrowRight') {
          e.preventDefault();
          const nextIdx = (activeIdx + 1) % topItems.length;
          topItems[nextIdx].focus();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevIdx = (activeIdx - 1 + topItems.length) % topItems.length;
          topItems[prevIdx].focus();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [location.pathname]);

  const handleToggleGroup = (groupId) => {
    setOpenDropdownId((prev) => (prev === groupId ? null : groupId));
  };

  // Handler for top-level navbar titles
  const handleTopNavKeyDown = (e) => {
    if (e.defaultPrevented) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    const topItems = getTopLevelItems();
    const currentTarget = e.currentTarget;
    const currentIndex = topItems.indexOf(currentTarget);
    const groupId = currentTarget.getAttribute('data-group-id');

    if (e.key === 'Enter') {
      // Direct module links (<a>) navigate natively via their existing link action.
      // Dropdown triggers (<button>) toggle the dropdown open/closed without moving focus.
      if (groupId) {
        e.preventDefault();
        handleToggleGroup(groupId);
      }
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (openDropdownId) setOpenDropdownId(null);
      if (topItems.length > 0 && currentIndex !== -1) {
        const nextIdx = (currentIndex + 1) % topItems.length;
        topItems[nextIdx].focus();
      }
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (openDropdownId) setOpenDropdownId(null);
      if (topItems.length > 0 && currentIndex !== -1) {
        const prevIdx = (currentIndex - 1 + topItems.length) % topItems.length;
        topItems[prevIdx].focus();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      if (groupId) {
        e.preventDefault();
        if (openDropdownId === groupId) {
          focusDropdownItem(groupId, 'first');
        } else {
          pendingFocusRef.current = 'first';
          setOpenDropdownId(groupId);
        }
      } else {
        const navId = currentTarget.getAttribute('data-nav-id');
        if (navId === 'dashboard' || location.pathname === '/') {
          e.preventDefault();
          const firstTarget =
            document.querySelector('[data-dashboard-totals="true"]') ||
            document.querySelector('[data-dashboard-discrepancy="true"]') ||
            document.querySelector('[data-dashboard-filter="true"]') ||
            document.querySelector('[data-dashboard-card="true"]') ||
            document.querySelector('[data-dashboard-nav="true"]');
          if (firstTarget) {
            firstTarget.focus();
            firstTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
          }
        } else {
          e.preventDefault();
        }
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      if (groupId) {
        e.preventDefault();
        if (openDropdownId === groupId) {
          focusDropdownItem(groupId, 'last');
        } else {
          pendingFocusRef.current = 'last';
          setOpenDropdownId(groupId);
        }
      } else {
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'Escape') {
      if (openDropdownId) {
        e.preventDefault();
        e.stopPropagation();
        setOpenDropdownId(null);
      }
      return;
    }

    if (e.key === 'Home') {
      e.preventDefault();
      if (topItems.length > 0) {
        topItems[0].focus();
      }
      return;
    }

    if (e.key === 'End') {
      e.preventDefault();
      if (topItems.length > 0) {
        topItems[topItems.length - 1].focus();
      }
      return;
    }

    if (e.key === ' ') {
      // Space activates direct links (<a> tags)
      if (currentTarget.tagName.toLowerCase() === 'a') {
        e.preventDefault();
        currentTarget.click();
      }
      return;
    }
  };

  // Handler for dropdown popovers
  const handleDropdownKeyDown = (e, groupId) => {
    if (e.defaultPrevented) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    // Do not override Left/Right cursor movement in text inputs/textareas
    const tagName = e.target?.tagName?.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea') {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        return;
      }
    }

    const dropdownEl = e.currentTarget;
    const items = getDropdownItems(dropdownEl);
    const activeEl = document.activeElement;
    const currentIdx = items.indexOf(activeEl);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (items.length === 0) return;
      const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % items.length;
      items[nextIdx].focus();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (items.length === 0) return;
      const prevIdx = currentIdx === -1 ? items.length - 1 : (currentIdx - 1 + items.length) % items.length;
      items[prevIdx].focus();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setOpenDropdownId(null);
      const parentBtn = navRef.current?.querySelector(`[data-group-id="${groupId}"]`);
      parentBtn?.focus();
      return;
    }

    if (e.key === 'Enter') {
      if (currentIdx !== -1) {
        e.preventDefault();
        e.stopPropagation();
        const selectedItem = items[currentIdx];
        setOpenDropdownId(null);
        selectedItem.click();
      }
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      setOpenDropdownId(null);
      const parentBtn = navRef.current?.querySelector(`[data-group-id="${groupId}"]`);
      parentBtn?.focus();
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      setOpenDropdownId(null);
      const topItems = getTopLevelItems();
      const parentBtn = navRef.current?.querySelector(`[data-group-id="${groupId}"]`);
      const parentIdx = topItems.indexOf(parentBtn);
      if (parentIdx !== -1) {
        const nextTop = topItems[(parentIdx + 1) % topItems.length];
        nextTop?.focus();
      }
      return;
    }

    if (e.key === 'Home') {
      e.preventDefault();
      e.stopPropagation();
      if (items.length > 0) {
        items[0].focus();
      }
      return;
    }

    if (e.key === 'End') {
      e.preventDefault();
      e.stopPropagation();
      if (items.length > 0) {
        items[items.length - 1].focus();
      }
      return;
    }

    if (e.key === 'Tab') {
      setTimeout(() => {
        setOpenDropdownId(null);
      }, 0);
      return;
    }
  };

  // Fetch branches
  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: branchesApi.list,
    enabled: canSwitch,
  });
  const branches = branchesQuery.data || [];

  useEffect(() => {
    if (canSwitch && branches.length > 0 && selectedBranchId === null) {
      const home = branches.find((b) => b.id === user?.branch_id) || branches[0];
      setSelectedBranchId(home.id);
    }
  }, [canSwitch, branches, selectedBranchId, user?.branch_id, setSelectedBranchId]);

  // Close popups on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
      if (navRef.current && !navRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setOpenDropdownId(null);
    setShowSearchDropdown(false);
    setShowProfileMenu(false);
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  const initials = (user?.name || user?.role || 'A')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const searchResults = searchQuery.trim()
    ? ALL_MODULE_SEARCH.filter(
        (m) =>
          checkPermission(user, m.perm) &&
          (m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.desc.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : ALL_MODULE_SEARCH.filter((m) => checkPermission(user, m.perm));

  const handleSelectModule = (to) => {
    navigate(to);
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  const isFieldSales = user?.role === 'Field Sales Executive';
  const isPosActive = location.pathname === '/pos';

  if (isFieldSales) {
    const FIELD_SALES_NAV = [
      { to: '/', label: 'Dashboard', perm: 'dashboard.view_financial_summary', icon: LayoutDashboard },
      { to: '/customers', label: 'Customers', perm: 'parties.manage_customers', icon: Users },
      { to: '/orders', label: 'Orders', perm: ['orders.create_prebooking', 'orders.view_prebooking', 'orders.manage_prebooking_status'], icon: ClipboardList },
      { to: '/vans', label: 'Vans', perm: ['inventory.issue_van_stock', 'inventory.view_stock'], icon: Truck },
      { to: '/van-stock', label: 'Van Stock', perm: ['inventory.issue_van_stock', 'inventory.view_stock'], icon: Package },
      { to: '/stock-history', label: 'Stock History', perm: ['inventory.view_stock', 'inventory.issue_van_stock'], icon: History },
    ];
    const visibleFieldSalesNav = FIELD_SALES_NAV.filter((item) =>
      checkPermission(user, item.perm, item.to)
    );

    return (
      <header className="sticky top-0 z-40 w-full shrink-0 shadow-md bg-[#351442] text-white">
        <div className="flex h-14 w-full items-center justify-between px-3 sm:px-5 lg:px-6 gap-2 sm:gap-4">
          {/* Left: KC Agency Brand Wordmark & Logo */}
          <Link to="/" className="flex items-center gap-2.5 transition-transform hover:opacity-95 shrink-0 group">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8244AD] to-[#511E69] text-white shadow-sm border border-white/10 group-hover:scale-105 transition-transform">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3L4 19h5l3-6 3 6h5L12 3z" fill="white" fillOpacity="0.9" stroke="none" />
                <path d="M12 9l-2.5 5h5L12 9z" fill="#351442" stroke="none" />
              </svg>
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-base font-extrabold tracking-tight text-white">
                KC Agency
              </span>
              <span className="text-[9.5px] font-semibold uppercase tracking-wider text-[#D8CEE2]">
                Field Sales
              </span>
            </div>
          </Link>

          {/* Center: Six Direct Links — NO DROPDOWNS, NO EXPANDABLES, NO NESTING */}
          <nav aria-label="Field Sales Navigation" className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-1">
            {visibleFieldSalesNav.map((item) => {
              const Icon = item.icon;
              const isActive = item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-white/40 ${
                    isActive
                      ? 'bg-[#8244AD] text-white shadow-xs'
                      : 'text-[#D8CEE2]/90 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={15} className="shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right: User Profile Area */}
          <div className="relative shrink-0" ref={profileRef}>
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 rounded-full p-1 sm:px-2 sm:py-1 hover:bg-white/10 transition-colors"
              title="User Account Menu"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8244AD] text-xs font-bold text-white shadow-sm border border-white/20">
                {initials}
              </div>
              <div className="hidden text-left leading-tight sm:block">
                <div className="text-xs font-bold text-white">{user?.name || 'User'}</div>
                <div className="text-[10px] font-medium text-[#D8CEE2]">{user?.role}</div>
              </div>
              <ChevronDown size={14} className="text-[#D8CEE2]" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border-soft bg-white p-2 shadow-soft-lg z-50 text-ink animate-in fade-in slide-in-from-top-1">
                <div className="border-b border-border-soft px-3 py-2">
                  <div className="text-xs font-bold text-ink">{user?.name}</div>
                  <div className="text-[10px] text-ink-muted">{user?.email || user?.username}</div>
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                    <ShieldCheck size={11} />
                    {user?.role}
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut size={15} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 w-full shrink-0 shadow-sm">
      {/* ======================================================== */}
      {/* ROW 1: Brand Logo, Module Search, Branch Switcher & Profile */}
      {/* ======================================================== */}
      <div className="flex h-14 w-full items-center justify-between border-b border-border-soft bg-white px-3 sm:px-5 lg:px-6">
        {/* Left: KC Agency Brand Wordmark & Logo Emblem */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 transition-transform hover:opacity-95 group">
            {/* Stylized Logo Emblem */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8244AD] to-[#511E69] text-white shadow-sm border border-white/10 group-hover:scale-105 transition-transform">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3L4 19h5l3-6 3 6h5L12 3z" fill="white" fillOpacity="0.9" stroke="none" />
                <path d="M12 9l-2.5 5h5L12 9z" fill="#351442" stroke="none" />
              </svg>
            </div>

            {/* Brand Title and Subtitle */}
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-base font-extrabold tracking-tight text-[#351442]">
                KC Agency
              </span>
              <span className="text-[9.5px] font-semibold uppercase tracking-wider text-[#8244AD]">
                Distributor Billing &amp; Inventory
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Module Search Bar */}
        <div className="relative max-w-md flex-1 px-2 sm:px-4 hidden md:block" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-light" size={16} />
            <input
              type="text"
              placeholder="Search modules (e.g. POS, Invoices, Stock)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              className="w-full rounded-full border border-border-soft bg-[#F7F5FF]/70 pl-10 pr-8 py-2 text-xs sm:text-sm text-ink placeholder:text-[#94A3B8] transition-all focus:bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchDropdown(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-light hover:text-ink"
                title="Clear Search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute left-2 right-2 sm:left-4 sm:right-4 top-full mt-2 rounded-2xl border border-border-soft bg-white p-2 shadow-soft-lg z-50">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-light px-3 py-1.5">
                Matching Modules
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {searchResults.map((m) => (
                  <button
                    key={m.to}
                    type="button"
                    onClick={() => handleSelectModule(m.to)}
                    className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-lavender-50 transition-colors group"
                  >
                    <div>
                      <div className="text-xs font-bold text-ink group-hover:text-primary transition-colors">
                        {m.label}
                      </div>
                      <div className="text-[10px] text-ink-muted">{m.desc}</div>
                    </div>
                    <span className="text-[10px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Jump →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Actions: Branch Switcher, User Profile & Mobile Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Branch Selector Pill */}
          {canSwitch && branches.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-full border border-border-soft bg-white px-3 py-1.5 shadow-xs hover:border-primary/40 transition-colors">
              <MapPin size={14} className="text-primary shrink-0" />
              <select
                value={selectedBranchId ?? ''}
                onChange={(e) => {
                  setSelectedBranchId(Number(e.target.value));
                  queryClient.invalidateQueries();
                }}
                className="cursor-pointer appearance-none bg-transparent pr-4 text-xs font-bold text-ink focus:outline-none"
                title="Switch Active Branch"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branch_name}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="text-ink-muted pointer-events-none -ml-3" />
            </div>
          )}

          {/* User Profile Pill & Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2.5 rounded-full p-1 sm:px-2 sm:py-1 hover:bg-lavender-50 transition-colors"
              title="User Account Menu"
            >
              {/* Circular Purple Avatar */}
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8244AD] text-xs font-bold text-white shadow-soft">
                {initials}
              </div>

              {/* User Name & Role */}
              <div className="hidden text-left leading-tight sm:block">
                <div className="text-xs font-bold text-ink">{user?.name || 'User'}</div>
                {user?.role && user.role.toLowerCase() !== (user?.name || '').toLowerCase() && (
                  <div className="text-[10px] font-medium text-ink-muted">{user.role}</div>
                )}
              </div>

              <ChevronDown size={14} className="hidden text-ink-muted sm:block" />
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border-soft bg-white p-2 shadow-soft-lg z-50 animate-in fade-in slide-in-from-top-1">
                <div className="border-b border-border-soft px-3 py-2">
                  <div className="text-xs font-bold text-ink">{user?.name}</div>
                  <div className="text-[10px] text-ink-muted">{user?.email || user?.username}</div>
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                    <ShieldCheck size={11} />
                    {user?.role}
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut size={15} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-lavender-100 hover:text-ink transition-colors"
            title="Open Navigation Menu"
            aria-label="Open Navigation Menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ROW 2: Horizontal Module Navigation Links & Groups       */}
      {/* ======================================================== */}
      <nav
        ref={navRef}
        aria-label="Main Navigation"
        className="relative flex h-11 w-full items-center justify-between bg-[#351442] px-3 sm:px-5 lg:px-6 text-[#D8CEE2] shadow-xs"
      >
        {/* Horizontal Navigation Items */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto lg:overflow-visible no-scrollbar py-1">
          {TOP_NAV_GROUPS.map((group) => {
            // Direct Link (Dashboard, Reports)
            if (group.isDirect) {
              if (!checkPermission(user, group.perm)) return null;
              const Icon = group.icon;
              const isDirectActive = group.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(group.to);

              return (
                <NavLink
                  key={group.id}
                  to={group.to}
                  end={group.to === '/'}
                  data-nav-top="true"
                  data-nav-id={group.id}
                  onKeyDown={handleTopNavKeyDown}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-white focus:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:bg-white/20 ${
                    isDirectActive
                      ? 'bg-[#8244AD] text-white shadow-xs font-bold'
                      : 'text-[#D8CEE2]/90 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={15} className="shrink-0" />
                  <span>{group.label}</span>
                </NavLink>
              );
            }

            // Dropdown Group (Sales, Products, Finance, Admin)
            const visibleItems = (group.items || []).filter((item) =>
              checkPermission(user, item.perm, item.to)
            );
            if (visibleItems.length === 0) return null;

            const GroupIcon = group.icon;
            const isGroupActive = visibleItems.some((item) =>
              item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
            );
            const isOpen = openDropdownId === group.id;

            return (
              <div key={group.id} className="relative">
                <button
                  type="button"
                  data-nav-top="true"
                  data-group-id={group.id}
                  onClick={() => handleToggleGroup(group.id)}
                  onKeyDown={handleTopNavKeyDown}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-white focus:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:bg-white/20 ${
                    isGroupActive
                      ? 'bg-[#8244AD] text-white font-bold shadow-xs'
                      : isOpen
                      ? 'bg-white/15 text-white'
                      : 'text-[#D8CEE2]/90 hover:bg-white/10 hover:text-white'
                  }`}
                  aria-expanded={isOpen}
                  aria-haspopup="menu"
                >
                  <GroupIcon size={15} className="shrink-0" />
                  <span>{group.label}</span>
                  <ChevronDown
                    size={13}
                    className={`text-[#D8CEE2]/80 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Popover */}
                {isOpen && (
                  <div
                    data-nav-dropdown={group.id}
                    onKeyDown={(e) => handleDropdownKeyDown(e, group.id)}
                    role="menu"
                    aria-label={group.label}
                    className="absolute left-0 top-full mt-1.5 w-64 rounded-2xl border border-border-soft bg-white p-2 shadow-soft-lg z-50 text-ink animate-in fade-in slide-in-from-top-1"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-ink-light px-2.5 py-1">
                      {group.label}
                    </div>
                    <div className="space-y-1 mt-0.5">
                      {visibleItems.map((item) => {
                        const ItemIcon = item.icon;
                        const isItemActive =
                          item.to === '/'
                            ? location.pathname === '/'
                            : location.pathname.startsWith(item.to);

                        return (
                          <Link
                            key={item.to}
                            to={item.to}
                            role="menuitem"
                            data-nav-dropdown-item="true"
                            onClick={() => setOpenDropdownId(null)}
                            className={`flex items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors group focus:outline-none focus:bg-lavender-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:bg-lavender-100 ${
                              isItemActive
                                ? 'bg-primary-soft text-primary font-bold'
                                : 'text-ink hover:bg-lavender-50 hover:text-primary'
                            }`}
                          >
                            <div
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5 transition-colors ${
                                isItemActive
                                  ? 'bg-primary text-white'
                                  : 'bg-[#F7F5FF] text-[#8244AD] group-hover:bg-primary group-hover:text-white'
                              }`}
                            >
                              <ItemIcon size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold leading-tight">
                                {item.label}
                              </div>
                              <div className="text-[10px] text-ink-muted leading-tight truncate mt-0.5">
                                {item.desc}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Quick POS Billing Action */}
        <div className="hidden sm:flex items-center pl-2">
          {checkPermission(user, 'pos.access', '/pos') && (
            <NavLink
              to="/pos"
              data-nav-top="true"
              data-nav-id="pos-billing"
              onKeyDown={handleTopNavKeyDown}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-white focus:bg-[#924ebf] focus-visible:ring-2 focus-visible:ring-white focus-visible:bg-[#924ebf] ${
                isPosActive
                  ? 'bg-[#924ebf] text-white ring-2 ring-white/30 shadow-sm'
                  : 'bg-[#8244AD] hover:bg-[#924ebf] text-white shadow-xs'
              }`}
              title="Open Point of Sale Terminal"
            >
              <ShoppingCart size={13} />
              <span>POS Billing</span>
            </NavLink>
          )}
        </div>
      </nav>

      {/* ======================================================== */}
      {/* MOBILE DRAWER: Responsive Full Navigation Overlay        */}
      {/* ======================================================== */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Menu Panel */}
          <div className="relative z-50 flex h-full w-72 flex-col bg-[#351442] text-[#D8CEE2] shadow-2xl animate-in slide-in-from-left">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#8244AD] to-[#511E69] text-white">
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 3L4 19h5l3-6 3 6h5L12 3z" fill="white" stroke="none" />
                    <path d="M12 9l-2.5 5h5L12 9z" fill="#351442" stroke="none" />
                  </svg>
                </div>
                <span className="text-sm font-extrabold text-white">KC Agency</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-[#D8CEE2] hover:bg-white/10 hover:text-white"
                title="Close Navigation"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mobile Module Navigation List */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {TOP_NAV_GROUPS.map((group) => {
                if (group.isDirect) {
                  if (!checkPermission(user, group.perm)) return null;
                  const Icon = group.icon;
                  const isActive = group.to === '/' ? location.pathname === '/' : location.pathname.startsWith(group.to);
                  return (
                    <NavLink
                      key={group.id}
                      to={group.to}
                      end={group.to === '/'}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold ${
                        isActive ? 'bg-[#8244AD] text-white font-bold' : 'text-[#D8CEE2] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon size={16} />
                      <span>{group.label}</span>
                    </NavLink>
                  );
                }

                const visibleItems = (group.items || []).filter((item) => checkPermission(user, item.perm, item.to));
                if (visibleItems.length === 0) return null;

                const GroupIcon = group.icon;
                return (
                  <div key={group.id} className="space-y-1">
                    <div className="flex items-center gap-2 px-3 pt-2 text-[10px] font-bold uppercase tracking-wider text-[#A899B8]">
                      <GroupIcon size={13} />
                      <span>{group.label}</span>
                    </div>
                    <div className="space-y-0.5 pl-2">
                      {visibleItems.map((item) => {
                        const ItemIcon = item.icon;
                        const isItemActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
                        return (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setMobileDrawerOpen(false)}
                            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium ${
                              isItemActive ? 'bg-[#8244AD] text-white font-bold' : 'text-[#D8CEE2]/85 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <ItemIcon size={15} />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Drawer Footer with User & Logout */}
            <div className="border-t border-white/10 p-3 bg-[#2B0E36]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8244AD] text-xs font-bold text-white">
                    {initials}
                  </div>
                  <div className="leading-tight">
                    <div className="text-xs font-bold text-white">{user?.name}</div>
                    <div className="text-[10px] text-[#A899B8]">{user?.role}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    logout();
                  }}
                  className="rounded-lg p-2 text-rose-400 hover:bg-white/10 hover:text-rose-300"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
