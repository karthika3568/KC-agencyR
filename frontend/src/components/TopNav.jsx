import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, NavLink, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
<<<<<<< HEAD
  Menu, Search, MapPin, ChevronDown, LogOut,
  X, Check, ShieldCheck, User, LayoutDashboard,
  ShoppingBag, Boxes, Landmark, SlidersHorizontal,
  BarChart3, ShoppingCart, FileText, Users,
  ClipboardList, RotateCcw, Package, Warehouse,
  Tag, Wallet, Receipt, Banknote, Settings as SettingsIcon,
  Sparkles, Truck, History
=======
  LayoutDashboard, ShoppingCart, Boxes, Landmark, BarChart3, Settings,
  FileText, Users, ClipboardList, RotateCcw,
  Package, Warehouse, Tag,
  Wallet, Receipt, Banknote,
  ShieldCheck,
  Search, MapPin, ChevronDown, LogOut, X, Menu
>>>>>>> 7fa1e0fda42f46920d1cdbc41a5d67cbf88c39e1
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePermission } from '../hooks/usePermission';
import { useBranchStore } from '../store/branchStore';
import { branchesApi } from '../api/branches';

// Primary Navbar Headings & Sub-items configuration
export const TOP_NAV_SECTIONS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    to: '/',
    perm: 'dashboard.view_financial_summary',
    exact: true,
  },
  {
    id: 'pos-billing',
    label: 'POS Billing',
    icon: ShoppingCart,
    to: '/pos',
    perm: 'pos.access',
    exact: true,
  },
  {
    id: 'sale-customer',
    label: 'Sale & Customer',
    icon: Users,
    to: '/parties',
    matchPaths: ['/parties', '/orders', '/returns'],
    subItems: [
      { to: '/parties', label: 'Parties', perm: 'parties.manage_customers', icon: Users },
      {
        to: '/orders',
        label: 'Orders & Indents',
        perm: [
          'orders.create_prebooking',
          'orders.create_purchase_indent',
          'orders.approve_purchase_request',
          'orders.manage_prebooking_status',
        ],
        icon: ClipboardList,
      },
      { to: '/returns', label: 'Returns', perm: 'returns.sales_return', icon: RotateCcw },
    ],
  },
  {
    id: 'products-inventory',
    label: 'Products & Inventory',
    icon: Boxes,
    to: '/catalog',
    matchPaths: ['/catalog', '/inventory', '/purchasing', '/price-adjustment'],
    subItems: [
      { to: '/catalog', label: 'Catalog', perm: 'catalog.manage_items', icon: Package },
      { to: '/inventory', label: 'Stock & Inventory', perm: 'inventory.view_stock', icon: Warehouse },
      { to: '/purchasing', label: 'Purchasing', perm: 'purchases.create_grn', icon: ShoppingCart },
      { to: '/price-adjustment', label: 'Price Adjustment', perm: 'catalog.manage_items', icon: Tag },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: Landmark,
    to: '/invoices',
    matchPaths: ['/invoices', '/collections', '/expenses', '/cash-handover'],
    subItems: [
      { to: '/invoices', label: 'Invoices', perm: 'pos.access', icon: FileText },
      { to: '/collections', label: 'Collections', perm: 'collections.field_collection_entry', icon: Wallet },
      { to: '/expenses', label: 'Expenses', perm: 'expenses.manage', icon: Receipt },
      { to: '/cash-handover', label: 'Cash Handover', perm: 'handover.submit_cash_handover', icon: Banknote },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    to: '/reports',
    perm: 'reports.view_all',
    matchPaths: ['/reports'],
  },
  {
    id: 'admin-settings',
    label: 'Administration & Settings',
    icon: Settings,
    to: '/staff',
    matchPaths: ['/staff', '/settings'],
    subItems: [
      { to: '/staff', label: 'Staff & Roles', perm: 'staff.manage_permissions', icon: ShieldCheck },
      { to: '/settings', label: 'Settings', perm: 'settings.manage', icon: Settings },
    ],
  },
];

// Helper to check user permissions
function checkPermission(user, perm, targetPath = null) {
  if (user?.role === 'Field Sales Executive' && targetPath === '/pos') {
    return false;
  }
  if (!perm) return true;
  if (!user || !user.permissions) return false;
  if (Array.isArray(perm)) {
    return perm.some((p) => user.permissions.includes(p));
  }
  return Boolean(user.permissions.includes(perm));
}

<<<<<<< HEAD
// Module search catalog with permission gating
const ALL_MODULE_SEARCH = [
  { to: '/', label: 'Dashboard', desc: 'Overview & metrics', perm: null },
  { to: '/pos', label: 'POS & Billing', desc: 'Counter sales & checkout', perm: 'pos.access' },
  { to: '/catalog', label: 'Products & Catalog', desc: 'Item master & prices', perm: 'catalog.manage_items' },
  { to: '/price-adjustment', label: 'Price Adjustment', desc: 'Wholesale & retail pricing', perm: 'catalog.manage_items' },
  { to: '/parties', label: 'Parties', desc: 'Customers & suppliers', perm: 'parties.manage_customers' },
  { to: '/purchasing', label: 'Purchasing (GRN)', desc: 'Goods receipts & vendor bills', perm: 'purchases.create_grn' },
  { to: '/orders', label: 'Orders & Indents', desc: 'Pre-bookings & purchase requests', perm: ['orders.create_prebooking', 'orders.view_prebooking', 'orders.manage_prebooking_status'] },
  { to: '/inventory', label: 'Inventory & Stock', desc: 'Branch stock levels & batches', perm: 'inventory.view_stock' },
  { to: '/returns', label: 'Returns', desc: 'Sales & customer returns', perm: 'returns.sales_return' },
  { to: '/invoices', label: 'Invoices', desc: 'Sales invoice history', perm: 'pos.access' },
  { to: '/collections', label: 'Collections', desc: 'Field payment entries', perm: 'collections.field_collection_entry' },
  { to: '/cash-handover', label: 'Cash Handover', desc: 'Shift reconciliation', perm: 'handover.submit_cash_handover' },
  { to: '/expenses', label: 'Expenses', desc: 'Operating costs & receipts', perm: 'expenses.manage' },
  { to: '/reports', label: 'Reports', desc: 'GST, Sales, P&L', perm: 'reports.view_all' },
  { to: '/staff', label: 'Staff & Roles', desc: 'Team & access permissions', perm: 'staff.manage_permissions' },
  { to: '/settings', label: 'Settings', desc: 'System configuration', perm: 'settings.manage' },
];

// Navigation structure
const TOP_NAV_GROUPS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    to: '/',
    perm: null,
    icon: LayoutDashboard,
    isDirect: true,
  },
  {
    id: 'sales-customers',
    label: 'Sales & Customers',
    icon: ShoppingBag,
    items: [
      { to: '/pos', label: 'Billing / POS', desc: 'Counter sales & instant checkout', perm: 'pos.access', icon: FileText },
      { to: '/parties', label: 'Parties', desc: 'Customers & supplier directory', perm: 'parties.manage_customers', icon: Users },
      {
        to: '/orders',
        label: 'Orders & Indents',
        desc: 'Pre-bookings & purchase requests',
        perm: [
          'orders.create_prebooking',
          'orders.create_purchase_indent',
          'orders.approve_purchase_request',
          'orders.manage_prebooking_status',
        ],
        icon: ClipboardList,
      },
      { to: '/returns', label: 'Returns', desc: 'Sales & customer return slips', perm: 'returns.sales_return', icon: RotateCcw },
    ],
  },
  {
    id: 'products-inventory',
    label: 'Products & Inventory',
    icon: Boxes,
    items: [
      { to: '/catalog', label: 'Catalog', desc: 'Item master, rates & barcodes', perm: 'catalog.manage_items', icon: Package },
      { to: '/inventory', label: 'Stock & Inventory', desc: 'Branch stock levels & batches', perm: 'inventory.view_stock', icon: Warehouse },
      { to: '/purchasing', label: 'Purchasing (GRN)', desc: 'Goods receipts & vendor bills', perm: 'purchases.create_grn', icon: ShoppingCart },
      { to: '/price-adjustment', label: 'Price Adjustment', desc: 'Wholesale & retail price changes', perm: 'catalog.manage_items', icon: Tag },
    ],
  },
  {
    id: 'finance-accounts',
    label: 'Finance & Accounts',
    icon: Landmark,
    items: [
      { to: '/invoices', label: 'Invoices', desc: 'Sales invoice history & print', perm: 'pos.access', icon: FileText },
      { to: '/collections', label: 'Collections', desc: 'Field payment collections', perm: 'collections.field_collection_entry', icon: Wallet },
      { to: '/expenses', label: 'Expenses', desc: 'Store operational expense vouchers', perm: 'expenses.manage', icon: Receipt },
      { to: '/cash-handover', label: 'Cash Handover', desc: 'Shift cash drawer reconciliation', perm: 'handover.submit_cash_handover', icon: Banknote },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    to: '/reports',
    perm: 'reports.view_all',
    icon: BarChart3,
    isDirect: true,
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: SlidersHorizontal,
    items: [
      { to: '/staff', label: 'Staff & Roles', desc: 'Team users & access permissions', perm: 'staff.manage_permissions', icon: ShieldCheck },
      { to: '/settings', label: 'Settings', desc: 'System configuration & preferences', perm: 'settings.manage', icon: SettingsIcon },
    ],
  },
];

export const TOP_NAV_GROUPS_LIST = TOP_NAV_GROUPS;
export const TOP_NAV_SECTIONS = TOP_NAV_GROUPS;
export { TOP_NAV_GROUPS };

export function TopNav({ onToggleSidebar, onToggleMobile } = {}) {
=======
// Helper to determine if a section is active
function isSectionActive(sec, currentPath) {
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

export function TopNav() {
>>>>>>> 7fa1e0fda42f46920d1cdbc41a5d67cbf88c39e1
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const canSwitch = usePermission('branches.switch_context');
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);

  const profileRef = useRef(null);
  const searchRef = useRef(null);

<<<<<<< HEAD
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
=======
  // Fetch branches for multi-branch switcher
>>>>>>> 7fa1e0fda42f46920d1cdbc41a5d67cbf88c39e1
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

  // Click outside to close menus
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = (user?.name || user?.role || 'A')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Search catalog of all modules
  const ALL_MODULE_SEARCH = [
    { to: '/', label: 'Dashboard', desc: 'Overview & metrics' },
    { to: '/pos', label: 'POS Billing', desc: 'Counter sales & checkout terminal' },
    { to: '/parties', label: 'Parties', desc: 'Customers & suppliers' },
    { to: '/orders', label: 'Orders & Indents', desc: 'Pre-bookings & purchase requests' },
    { to: '/returns', label: 'Returns', desc: 'Sales & customer returns' },
    { to: '/catalog', label: 'Catalog', desc: 'Item master & prices' },
    { to: '/inventory', label: 'Stock & Inventory', desc: 'Branch stock levels & batches' },
    { to: '/purchasing', label: 'Purchasing (GRN)', desc: 'Goods receipts & vendor bills' },
    { to: '/price-adjustment', label: 'Price Adjustment', desc: 'Wholesale & retail pricing' },
    { to: '/invoices', label: 'Invoices', desc: 'Sales invoice history' },
    { to: '/collections', label: 'Collections', desc: 'Field payment entries' },
    { to: '/expenses', label: 'Expenses', desc: 'Operating costs & receipts' },
    { to: '/cash-handover', label: 'Cash Handover', desc: 'Shift reconciliation' },
    { to: '/reports', label: 'Reports', desc: 'GST, Sales, P&L' },
    { to: '/staff', label: 'Staff & Roles', desc: 'Team & access permissions' },
    { to: '/settings', label: 'Settings', desc: 'System configuration' },
  ];

  const searchResults = searchQuery.trim()
    ? ALL_MODULE_SEARCH.filter(
        (m) =>
          checkPermission(user, m.perm) &&
          (m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.desc.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : ALL_MODULE_SEARCH;

  // Filter sections by permissions
  const visibleSections = TOP_NAV_SECTIONS.filter((sec) => {
    if (sec.subItems && sec.subItems.length > 0) {
      return sec.subItems.some((item) => checkPermission(user, item.perm));
    }
    return checkPermission(user, sec.perm);
  });

  // Identify currently active section
  const activeSection = TOP_NAV_SECTIONS.find((sec) =>
    isSectionActive(sec, location.pathname)
  );

  // Sub-items for the active section (filtered by permissions)
  const visibleSubItems = activeSection?.subItems
    ? activeSection.subItems.filter((item) => checkPermission(user, item.perm))
    : [];

  const handleSectionClick = (section) => {
    if (isSectionActive(section, location.pathname)) {
      return;
    }
    if (section.subItems && section.subItems.length > 0) {
      const firstPermitted = section.subItems.find((item) =>
        checkPermission(user, item.perm)
      );
      if (firstPermitted) {
        navigate(firstPermitted.to);
        return;
      }
    }
    navigate(section.to);
  };

  const handleSelectModule = (to) => {
    navigate(to);
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

<<<<<<< HEAD
  const isFieldSales = user?.role === 'Field Sales Executive';
  const isPosActive = location.pathname === '/pos';

  if (isFieldSales) {
    const FIELD_SALES_NAV = [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/customers', label: 'Customers', icon: Users },
      { to: '/orders', label: 'Orders', icon: ClipboardList },
      { to: '/vans', label: 'Vans', icon: Truck },
      { to: '/van-stock', label: 'Van Stock', icon: Package },
      { to: '/stock-history', label: 'Stock History', icon: History },
    ];
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
            {FIELD_SALES_NAV.map((item) => {
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
=======
  const isPosActive = location.pathname === '/pos';
>>>>>>> 7fa1e0fda42f46920d1cdbc41a5d67cbf88c39e1

  return (
    <header className="sticky top-0 z-30 flex flex-col shrink-0 w-full select-none shadow-sm">
      {/* 1. TOP UTILITY BAR (Clean White: Logo, Search Bar, Branch Switcher, Profile) */}
      <div className="flex h-14 w-full shrink-0 items-center justify-between border-b border-[#E5E7F5] bg-white px-4 sm:px-6">
        {/* Left: Brand Logo & Wordmark */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6F2DA8] text-white font-bold text-base shadow-sm ring-2 ring-primary/20 group-hover:scale-105 transition-transform">
            A
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-extrabold tracking-tight text-[#6F2DA8] font-sans">
              KC Agency
            </span>
            <span className="text-[8.5px] font-bold uppercase tracking-wider text-[#8244AD]/80">
              DISTRIBUTOR BILLING &amp; INVENTORY
            </span>
          </div>
        </Link>

        {/* Center: Wide Module Search Bar */}
        <div className="relative max-w-xl w-full mx-4 hidden md:block" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={15} />
            <input
              type="text"
              placeholder="Search modules (e.g. POS, Invoices, Stock)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              className="w-full rounded-full border border-[#E5E7F5] bg-[#F7F5FF]/80 pl-10 pr-8 py-2 text-xs text-ink placeholder:text-[#94A3B8] transition-all focus:bg-white focus:border-[#6F2DA8] focus:outline-none focus:ring-2 focus:ring-[#6F2DA8]/15 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchDropdown(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-ink"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Search Dropdown Results */}
          {showSearchDropdown && (
            <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-border-soft bg-white p-3 shadow-soft-lg z-50 text-ink">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-light px-2 py-1">
                Matching Modules
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {searchResults.map((m) => (
                  <button
                    key={m.to}
                    onClick={() => handleSelectModule(m.to)}
                    className="w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-left hover:bg-lavender-50 transition-colors group"
                  >
                    <div>
                      <div className="text-xs font-bold text-ink group-hover:text-primary transition-colors">
                        {m.label}
                      </div>
                      <div className="text-[10px] text-ink-muted">{m.desc}</div>
                    </div>
                    <span className="text-[10px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Go →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Branch Selector & Admin Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Branch Selector Pill */}
          {canSwitch && branches.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-full border border-[#E5E7F5] bg-white px-3 py-1.5 shadow-2xs hover:border-[#6F2DA8]/40 transition-colors">
              <MapPin size={13} className="text-[#6F2DA8] shrink-0" />
              <select
                value={selectedBranchId ?? ''}
                onChange={(e) => {
                  setSelectedBranchId(Number(e.target.value));
                  queryClient.invalidateQueries();
                }}
                className="cursor-pointer appearance-none bg-transparent pr-4 text-xs font-bold text-ink focus:outline-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branch_name}
                  </option>
                ))}
              </select>
              <ChevronDown size={11} className="text-[#94A3B8] pointer-events-none -ml-3" />
            </div>
          )}

          {/* User Profile Pill */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 rounded-full p-1 sm:px-2.5 sm:py-1 hover:bg-lavender-50 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6F2DA8] text-xs font-bold text-white shadow-soft shrink-0">
                {initials}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <div className="text-xs font-bold text-ink">
                  {user?.role || user?.name || 'Super Admin'}
                </div>
              </div>
              <ChevronDown size={12} className="text-[#94A3B8]" />
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border-soft bg-white p-2 shadow-soft-lg z-50 text-ink">
                <div className="border-b border-border-soft px-3 py-2">
                  <div className="text-xs font-bold text-ink">{user?.name || 'User'}</div>
                  <div className="text-[10px] text-ink-muted">{user?.email || user?.username}</div>
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                    <ShieldCheck size={11} />
                    {user?.role}
                  </div>
                </div>

                <div className="pt-1">
                  <button
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

          {/* Mobile Menu Hamburger Toggle */}
          <button
            onClick={() => setShowMobileDrawer(true)}
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-ink hover:bg-lavender-100 transition-colors"
            aria-label="Open Navigation Menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

<<<<<<< HEAD
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
=======
      {/* 2. MAIN NAVBAR (Dark Navy/Purple Bar: Primary Nav Links Centered) */}
      <div className="flex h-11 w-full shrink-0 items-center bg-[#2B0E36] px-2 sm:px-6 shadow-md border-b border-white/10 overflow-x-auto scrollbar-none">
        {/* Primary Headings: centered on desktop via mx-auto, starts cleanly at left on mobile without data-loss clipping */}
        <nav className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3.5 lg:gap-4 min-w-max mx-auto px-1">
          {visibleSections.map((sec) => {
            const Icon = sec.icon;
            const isActive = isSectionActive(sec, location.pathname);
>>>>>>> 7fa1e0fda42f46920d1cdbc41a5d67cbf88c39e1

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => handleSectionClick(sec)}
                className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 rounded-xl text-xs whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-[#8244AD] text-white shadow-soft font-bold'
                    : 'text-[#D8CEE2]/90 hover:text-white hover:bg-white/10 font-semibold'
                }`}
              >
                <Icon size={15} className={`shrink-0 ${isActive ? 'text-white' : 'text-[#D8CEE2]/80'}`} />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

<<<<<<< HEAD
        {/* Right: Quick POS Billing Action */}
        <div className="hidden sm:flex items-center pl-2">
          {checkPermission(user, 'pos.access', '/pos') && (
            <NavLink
              to="/pos"
              data-nav-top="true"
              data-nav-id="pos-billing"
              onKeyDown={handleTopNavKeyDown}
              className="flex items-center gap-1.5 rounded-lg bg-[#8244AD] hover:bg-[#924ebf] px-3 py-1 text-xs font-bold text-white shadow-xs transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-white focus:bg-[#924ebf] focus-visible:ring-2 focus-visible:ring-white focus-visible:bg-[#924ebf]"
              title="Open Point of Sale Terminal"
            >
              <ShoppingCart size={13} />
              <span>POS Billing</span>
            </NavLink>
          )}
=======
      {/* 3. SECONDARY SUB-NAVBAR (Clean White Row for Sub-items when in a section) */}
      {visibleSubItems.length > 0 && (
        <div className="flex w-full shrink-0 items-center border-b border-[#E5E7F5] bg-white px-2 sm:px-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 min-w-max mx-auto px-1 py-0">
            {visibleSubItems.map((item) => {
              const ItemIcon = item.icon;
              const isItemActive =
                location.pathname === item.to || location.pathname.startsWith(item.to + '/');
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`group flex items-center gap-2 px-3 sm:px-3.5 py-2.5 text-xs sm:text-[13px] font-semibold whitespace-nowrap transition-all border-b-2 ${
                    isItemActive
                      ? 'border-[#8244AD] text-[#8244AD] font-bold'
                      : 'border-transparent text-[#697797] hover:text-[#17233D] hover:border-[#D8CEE2]'
                  }`}
                >
                  <ItemIcon
                    size={15}
                    className={`shrink-0 transition-colors ${
                      isItemActive ? 'text-[#8244AD]' : 'text-[#697797] group-hover:text-[#17233D]'
                    }`}
                  />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
>>>>>>> 7fa1e0fda42f46920d1cdbc41a5d67cbf88c39e1
        </div>
      )}

      {/* 4. MOBILE SLIDE-OUT DRAWER */}
      {showMobileDrawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowMobileDrawer(false)}
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-72 bg-[#2B0E36] text-[#D8CEE2] p-4 flex flex-col shadow-2xl overflow-y-auto">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8244AD] text-white font-bold text-sm">
                  A
                </div>
                <div>
                  <div className="text-sm font-bold text-white">KC Agency</div>
                  <div className="text-[9px] text-[#D8CEE2]/70 font-semibold uppercase tracking-wider">
                    Distributor Billing
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowMobileDrawer(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-[#D8CEE2]"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Nav Sections */}
            <div className="flex-1 py-4 space-y-3">
              {visibleSections.map((sec) => {
                const Icon = sec.icon;
                const isActive = isSectionActive(sec, location.pathname);
                return (
                  <div key={sec.id} className="space-y-1">
                    <button
                      onClick={() => {
                        handleSectionClick(sec);
                        if (!sec.subItems || sec.subItems.length === 0) {
                          setShowMobileDrawer(false);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                        isActive
                          ? 'bg-[#8244AD] text-white font-bold shadow-soft'
                          : 'text-[#D8CEE2] hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} />
                        <span>{sec.label}</span>
                      </div>
                    </button>

<<<<<<< HEAD
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
=======
                    {/* Sub-items in mobile menu */}
                    {sec.subItems && sec.subItems.length > 0 && (
                      <div className="pl-6 space-y-1 pt-0.5 border-l border-white/10 ml-3">
                        {sec.subItems
                          .filter((item) => checkPermission(user, item.perm))
                          .map((item) => {
                            const SubIcon = item.icon;
                            const isSubActive =
                              location.pathname === item.to ||
                              location.pathname.startsWith(item.to + '/');
                            return (
                              <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={() => setShowMobileDrawer(false)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                                  isSubActive
                                    ? 'bg-white/20 text-white font-bold'
                                    : 'text-[#D8CEE2]/80 hover:text-white hover:bg-white/10'
                                }`}
                              >
                                <SubIcon size={14} />
                                <span>{item.label}</span>
                              </NavLink>
                            );
                          })}
                      </div>
                    )}
>>>>>>> 7fa1e0fda42f46920d1cdbc41a5d67cbf88c39e1
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
