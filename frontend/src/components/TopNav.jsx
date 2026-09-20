import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck, Warehouse, RotateCcw,
  Wallet, Banknote, Receipt, BarChart3, ShieldCheck, Settings as SettingsIcon,
  Building2, LogOut, ChevronDown, MapPin,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePermission } from '../hooks/usePermission';
import { useBranchStore } from '../store/branchStore';
import { branchesApi } from '../api/branches';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', perm: 'dashboard.view_financial_summary', icon: LayoutDashboard },
  { to: '/pos', label: 'Billing', perm: 'pos.access', icon: ShoppingCart },
  { to: '/catalog', label: 'Catalog', perm: 'catalog.manage_items', icon: Package },
  { to: '/parties', label: 'Parties', perm: 'parties.manage_customers', icon: Users },
  { to: '/purchasing', label: 'Purchasing', perm: 'purchases.create_grn', icon: Truck },
  { to: '/inventory', label: 'Inventory', perm: 'inventory.view_stock', icon: Warehouse },
  { to: '/returns', label: 'Returns', perm: 'returns.sales_return', icon: RotateCcw },
  { to: '/collections', label: 'Collections', perm: 'collections.field_collection_entry', icon: Wallet },
  { to: '/cash-handover', label: 'Cash Handover', perm: 'handover.submit_cash_handover', icon: Banknote },
  { to: '/expenses', label: 'Expenses', perm: 'expenses.manage', icon: Receipt },
  { to: '/reports', label: 'Reports', perm: 'reports.view_all', icon: BarChart3 },
  { to: '/staff', label: 'Staff', perm: 'staff.manage_permissions', icon: ShieldCheck },
  { to: '/settings', label: 'Settings', perm: 'settings.manage', icon: SettingsIcon },
  { to: '/branches', label: 'Branches', perm: 'branches.manage', icon: Building2 },
];

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive ? 'bg-navbar-alt text-gold shadow-inner' : 'text-ink-onnavy/80 hover:bg-white/5 hover:text-ink-onnavy'
        }`
      }
    >
      <Icon size={16} />
      <span>{label}</span>
    </NavLink>
  );
}

function BranchSwitcher() {
  const canSwitch = usePermission('branches.switch_context');
  const queryClient = useQueryClient();
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { user } = useAuth();

  const branchesQuery = useQuery({ queryKey: ['branches'], queryFn: branchesApi.list, enabled: canSwitch });
  const branches = branchesQuery.data || [];

  useEffect(() => {
    if (canSwitch && branches.length > 0 && selectedBranchId === null) {
      const home = branches.find((b) => b.id === user?.branch_id) || branches[0];
      setSelectedBranchId(home.id);
    }
  }, [canSwitch, branches, selectedBranchId, user?.branch_id, setSelectedBranchId]);

  if (!canSwitch) return null;

  return (
    <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-navbar-alt px-2.5 py-1.5">
      <MapPin size={14} className="text-gold" />
      <select
        value={selectedBranchId ?? ''}
        onChange={(e) => {
          setSelectedBranchId(Number(e.target.value));
          queryClient.invalidateQueries();
        }}
        className="border-none bg-transparent text-sm font-medium text-ink-onnavy focus:outline-none [&>option]:text-ink"
      >
        {branches.map((b) => (
          <option key={b.id} value={b.id}>{b.branch_name}</option>
        ))}
      </select>
    </div>
  );
}

export function TopNav() {
  const { user, logout } = useAuth();
  const initials = (user?.name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="bg-navbar px-4 py-2.5">
      <div className="flex items-center gap-4">
        <div className="flex shrink-0 flex-col leading-none">
          <span className="brand-wordmark text-lg">POS System</span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-ink-onnavy/50">
            Distributor Billing &amp; Inventory
          </span>
        </div>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <PermissionGatedNavItem key={item.to} {...item} />
          ))}
        </nav>

        <BranchSwitcher />

        <div className="flex shrink-0 items-center gap-3 border-l border-white/10 pl-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-xs font-bold text-navbar">
            {initials}
          </div>
          <div className="hidden leading-tight sm:block">
            <div className="text-sm font-semibold text-ink-onnavy">{user?.name}</div>
            <div className="text-xs text-ink-onnavy/60">{user?.role}</div>
          </div>
          <ChevronDown size={14} className="hidden text-ink-onnavy/60 sm:block" />
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-ink-onnavy/80 hover:bg-white/5 hover:text-ink-onnavy"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function PermissionGatedNavItem({ perm, ...item }) {
  const allowed = usePermission(perm);
  if (!allowed) return null;
  return <NavItem end={item.to === '/'} {...item} />;
}
