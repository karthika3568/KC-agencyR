import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Package, Tag, Users, ShoppingCart,
  ClipboardList, Warehouse, RotateCcw, Wallet, Banknote,
  Receipt, BarChart3, ShieldCheck, Settings as SettingsIcon,
  Sparkles, X, ChevronDown, ShoppingBag, Boxes, Landmark,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';

export const DASHBOARD_NAV = {
  to: '/',
  label: 'Dashboard',
  perm: 'dashboard.view_financial_summary',
  icon: LayoutDashboard,
};

export const NAV_SECTIONS = [
  {
    id: 'operations',
    title: 'Operations',
    groups: [
      {
        id: 'sales-customers',
        label: 'Sales & Customers',
        icon: ShoppingBag,
        items: [
          { to: '/pos', label: 'Billing', perm: 'pos.access', icon: FileText },
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
        items: [
          { to: '/catalog', label: 'Catalog', perm: 'catalog.manage_items', icon: Package },
          { to: '/inventory', label: 'Stock & Inventory', perm: 'inventory.view_stock', icon: Warehouse },
          { to: '/purchasing', label: 'Purchasing', perm: 'purchases.create_grn', icon: ShoppingCart },
          { to: '/price-adjustment', label: 'Price Adjustment', perm: 'catalog.manage_items', icon: Tag },
        ],
      },
    ],
  },
  {
    id: 'finance-accounts',
    title: 'Finance & Accounts',
    groups: [
      {
        id: 'finance',
        label: 'Finance',
        icon: Landmark,
        items: [
          { to: '/invoices', label: 'Invoices', perm: 'pos.access', icon: FileText },
          { to: '/collections', label: 'Collections', perm: 'collections.field_collection_entry', icon: Wallet },
          { to: '/expenses', label: 'Expenses', perm: 'expenses.manage', icon: Receipt },
          { to: '/cash-handover', label: 'Cash Handover', perm: 'handover.submit_cash_handover', icon: Banknote },
        ],
      },
      {
        id: 'reports-module',
        label: 'Reports',
        to: '/reports',
        perm: 'reports.view_all',
        icon: BarChart3,
      },
    ],
  },
  {
    id: 'administration',
    title: 'Administration',
    groups: [
      {
        id: 'admin-settings',
        label: 'Administration & Settings',
        icon: SlidersHorizontal,
        items: [
          { to: '/staff', label: 'Staff & Roles', perm: 'staff.manage_permissions', icon: ShieldCheck },
          { to: '/settings', label: 'Settings', perm: 'settings.manage', icon: SettingsIcon },
        ],
      },
    ],
  },
];

// Preserved flat navigation lists for backwards compatibility
export const PRIMARY_NAV = [
  DASHBOARD_NAV,
  ...NAV_SECTIONS[0].groups[0].items,
  ...NAV_SECTIONS[0].groups[1].items,
];

export const SECONDARY_NAV = [
  ...NAV_SECTIONS[1].groups[0].items,
  NAV_SECTIONS[1].groups[1],
];

export const SYSTEM_NAV = [
  ...NAV_SECTIONS[2].groups[0].items,
];

function checkPermission(user, perm) {
  if (!perm) return true;
  if (!user || !user.permissions) return false;
  if (Array.isArray(perm)) {
    return perm.some((p) => user.permissions.includes(p));
  }
  return Boolean(user.permissions.includes(perm));
}

function NavItem({ to, label, icon: Icon, collapsed, onClick, end, isChild = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl transition-all group ${
          isChild
            ? 'px-3 py-2 text-[12px] font-medium'
            : 'px-3.5 py-2.5 text-xs font-semibold'
        } ${
          isActive
            ? 'bg-[#8244AD] text-white shadow-soft-md font-bold'
            : isChild
            ? 'text-[#D8CEE2]/80 hover:bg-white/10 hover:text-white'
            : 'text-[#D8CEE2]/85 hover:bg-white/10 hover:text-white'
        } ${collapsed ? 'justify-center px-2.5' : ''}`
      }
    >
      <Icon
        size={isChild ? 16 : 18}
        className={`shrink-0 transition-transform group-hover:scale-105 ${
          isChild ? 'text-[#D8CEE2]/70 group-hover:text-white' : ''
        }`}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

function NavGroup({
  group,
  isOpen,
  onToggle,
  collapsed,
  onCloseMobile,
  user,
  currentPath,
}) {
  // Direct link without submenu (e.g. Reports)
  if (group.to) {
    if (!checkPermission(user, group.perm)) return null;
    return (
      <NavItem
        to={group.to}
        label={group.label}
        icon={group.icon}
        collapsed={collapsed}
        onClick={onCloseMobile}
        end={group.to === '/'}
      />
    );
  }

  // Filter items by permission
  const visibleItems = (group.items || []).filter((item) =>
    checkPermission(user, item.perm)
  );

  // If no items in this group are permitted for the current user, hide the group
  if (visibleItems.length === 0) return null;

  const GroupIcon = group.icon;
  const isChildActive = visibleItems.some((item) =>
    item.to === '/' ? currentPath === '/' : currentPath.startsWith(item.to)
  );

  return (
    <div className="space-y-0.5">
      {/* Group Toggle Header */}
      <button
        type="button"
        onClick={() => onToggle(group.id)}
        title={collapsed ? group.label : undefined}
        className={`w-full flex items-center transition-all group rounded-xl ${
          collapsed
            ? 'justify-center p-2.5'
            : 'justify-between px-3.5 py-2.5 text-xs font-semibold'
        } ${
          isChildActive && !isOpen
            ? 'bg-white/10 text-white font-bold'
            : 'text-[#D8CEE2]/90 hover:bg-white/5 hover:text-white'
        }`}
      >
        <div className={`flex items-center gap-3 min-w-0 ${collapsed ? 'justify-center' : ''}`}>
          <GroupIcon
            size={18}
            className={`shrink-0 transition-transform group-hover:scale-105 ${
              isChildActive ? 'text-[#DDD0FF]' : 'text-[#D8CEE2]/80'
            }`}
          />
          {!collapsed && <span className="truncate">{group.label}</span>}
        </div>

        {!collapsed && (
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {isChildActive && !isOpen && (
              <span className="h-1.5 w-1.5 rounded-full bg-[#DDD0FF]" title="Active page inside" />
            )}
            <ChevronDown
              size={15}
              className={`text-[#A899B8] transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-white' : ''
              }`}
            />
          </div>
        )}
      </button>

      {/* Submenu Items */}
      {isOpen && (
        <div
          className={`${
            collapsed
              ? 'py-1 space-y-1'
              : 'mt-1 ml-4 pl-2.5 border-l border-white/10 space-y-1 py-0.5'
          }`}
        >
          {visibleItems.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              collapsed={collapsed}
              onClick={onCloseMobile}
              isChild={!collapsed}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ collapsed, isMobileOpen, onCloseMobile }) {
  const { user } = useAuth();
  const location = useLocation();

  // Helper to find which group contains a given path
  const findGroupIdForPath = (path) => {
    for (const section of NAV_SECTIONS) {
      for (const group of section.groups) {
        if (group.items) {
          const match = group.items.some((item) =>
            item.to === '/' ? path === '/' : path.startsWith(item.to)
          );
          if (match) return group.id;
        }
      }
    }
    return null;
  };

  // State to track expanded groups
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {
      'sales-customers': true,
    };
    const activeGroupId = findGroupIdForPath(
      typeof window !== 'undefined' ? window.location.pathname : '/'
    );
    if (activeGroupId) {
      initial[activeGroupId] = true;
    }
    return initial;
  });

  // Automatically expand group containing the current page whenever path changes
  useEffect(() => {
    const activeGroupId = findGroupIdForPath(location.pathname);
    if (activeGroupId) {
      setOpenGroups((prev) => {
        if (prev[activeGroupId]) return prev;
        return { ...prev, [activeGroupId]: true };
      });
    }
  }, [location.pathname]);

  const handleToggleGroup = (groupId) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const showDashboard = checkPermission(user, DASHBOARD_NAV.perm);

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#351442] text-[#D8CEE2] transition-all duration-300 ease-in-out lg:static lg:z-auto ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Brand Header */}
        <div
          className={`flex items-center gap-3 px-5 py-4.5 border-b border-white/5 relative ${
            collapsed ? 'justify-center px-2' : ''
          }`}
        >
          {/* Stylized Logo Emblem */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8244AD] to-[#511E69] text-white shadow-md border border-white/10">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-6 w-6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3L4 19h5l3-6 3 6h5L12 3z" fill="white" fillOpacity="0.9" stroke="none" />
              <path d="M12 9l-2.5 5h5L12 9z" fill="#351442" stroke="none" />
            </svg>
          </div>

          {!collapsed && (
            <div className="flex flex-col leading-tight min-w-0 flex-1">
              <span className="text-base font-extrabold tracking-tight text-white truncate">
                KC Agency
              </span>
              <span className="text-[9.5px] font-semibold uppercase tracking-wider text-[#A899B8] truncate">
                Distributor Billing &amp; Inventory
              </span>
            </div>
          )}

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-[#A899B8] hover:text-white hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Links with custom scrollbar */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {/* Dashboard (Separate at top) */}
          {showDashboard && (
            <div className="space-y-1">
              <NavItem
                to={DASHBOARD_NAV.to}
                label={DASHBOARD_NAV.label}
                icon={DASHBOARD_NAV.icon}
                collapsed={collapsed}
                onClick={onCloseMobile}
                end={true}
              />
            </div>
          )}

          {/* Render Logical Groups by Section */}
          {NAV_SECTIONS.map((section) => {
            // Check if any group in this section is visible
            const visibleGroups = section.groups.filter((group) => {
              if (group.to) return checkPermission(user, group.perm);
              return (group.items || []).some((item) => checkPermission(user, item.perm));
            });

            if (visibleGroups.length === 0) return null;

            return (
              <div key={section.id} className="space-y-1">
                {/* Group Divider */}
                <div className="border-t border-white/10 mx-2 mb-2.5" />

                {/* Section Header */}
                {!collapsed && (
                  <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#A899B8]/70">
                    {section.title}
                  </div>
                )}

                {/* Section Groups / Modules */}
                {visibleGroups.map((group) => (
                  <NavGroup
                    key={group.id}
                    group={group}
                    isOpen={Boolean(openGroups[group.id])}
                    onToggle={handleToggleGroup}
                    collapsed={collapsed}
                    onCloseMobile={onCloseMobile}
                    user={user}
                    currentPath={location.pathname}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Bottom Decorative Footer with Wave Accent */}
        <div className="relative mt-auto border-t border-white/5 bg-[#2B0E36] overflow-hidden">
          {/* Subtle wavy vector background */}
          <svg
            className="absolute bottom-0 left-0 right-0 w-full opacity-20 pointer-events-none"
            viewBox="0 0 200 60"
            preserveAspectRatio="none"
          >
            <path
              d="M0 30 C 50 10, 100 50, 200 20 L 200 60 L 0 60 Z"
              fill="#8244AD"
            />
          </svg>

          {!collapsed ? (
            <div className="relative z-10 flex items-center gap-2.5 px-4 py-3.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/90">
                <Sparkles size={14} className="text-[#DDD0FF]" />
              </div>
              <div className="flex flex-col text-[11px] font-medium leading-tight text-sidebar-muted">
                <span className="font-semibold text-white/90">Smarter Distribution</span>
                <span>Better Business</span>
              </div>
            </div>
          ) : (
            <div className="relative z-10 flex items-center justify-center py-3">
              <Sparkles size={16} className="text-[#DDD0FF]/80" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
