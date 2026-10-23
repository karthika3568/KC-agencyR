import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, NavLink, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, ShoppingCart, Boxes, Landmark, BarChart3, Settings,
  FileText, Users, ClipboardList, RotateCcw,
  Package, Warehouse, Tag,
  Wallet, Receipt, Banknote,
  ShieldCheck,
  Search, MapPin, ChevronDown, LogOut, X, Menu
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
function checkPermission(user, perm) {
  if (!perm) return true;
  if (!user || !user.permissions) return false;
  if (Array.isArray(perm)) {
    return perm.some((p) => user.permissions.includes(p));
  }
  return Boolean(user.permissions.includes(perm));
}

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

  // Fetch branches for multi-branch switcher
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
          m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.desc.toLowerCase().includes(searchQuery.toLowerCase())
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

  const isPosActive = location.pathname === '/pos';

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

      {/* 2. MAIN NAVBAR (Dark Navy/Purple Bar: Primary Nav Links Centered) */}
      <div className="flex h-11 w-full shrink-0 items-center justify-center bg-[#2B0E36] px-4 sm:px-6 shadow-md border-b border-white/10">
        {/* Center: Primary Headings perfectly centered with equal, uniform spacing */}
        <nav className="flex items-center justify-center gap-1.5 sm:gap-2.5 md:gap-3.5 lg:gap-4 overflow-x-auto scrollbar-none">
          {visibleSections.map((sec) => {
            const Icon = sec.icon;
            const isActive = isSectionActive(sec, location.pathname);

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => handleSectionClick(sec)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all duration-150 ${
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

      {/* 3. SECONDARY SUB-NAVBAR (Clean White Row for Sub-items when in a section) */}
      {visibleSubItems.length > 0 && (
        <div className="flex w-full shrink-0 items-center justify-center border-b border-[#E5E7F5] bg-white px-4 sm:px-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-x-auto scrollbar-none">
          <div className="flex items-center justify-center gap-2 sm:gap-4 lg:gap-6 py-0">
            {visibleSubItems.map((item) => {
              const ItemIcon = item.icon;
              const isItemActive =
                location.pathname === item.to || location.pathname.startsWith(item.to + '/');
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`group flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-[13px] font-semibold whitespace-nowrap transition-all border-b-2 ${
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
