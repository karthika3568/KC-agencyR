import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Menu, Search, MapPin, ChevronDown, LogOut,
  X, Check, ShieldCheck, User
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { usePermission } from '../hooks/usePermission';
import { useBranchStore } from '../store/branchStore';
import { branchesApi } from '../api/branches';

export function TopNav({ onToggleSidebar, onToggleMobile }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canSwitch = usePermission('branches.switch_context');
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const profileRef = useRef(null);
  const searchRef = useRef(null);

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
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = (user?.name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Quick module search list
  const ALL_MODULE_SEARCH = [
    { to: '/', label: 'Dashboard', desc: 'Overview & metrics' },
    { to: '/pos', label: 'POS & Billing', desc: 'Counter sales & checkout' },
    { to: '/catalog', label: 'Products & Catalog', desc: 'Item master & prices' },
    { to: '/price-adjustment', label: 'Price Adjustment', desc: 'Wholesale & retail pricing' },
    { to: '/parties', label: 'Parties', desc: 'Customers & suppliers' },
    { to: '/purchasing', label: 'Purchasing (GRN)', desc: 'Goods receipts & vendor bills' },
    { to: '/orders', label: 'Orders & Indents', desc: 'Pre-bookings & purchase requests' },
    { to: '/inventory', label: 'Inventory & Stock', desc: 'Branch stock levels & batches' },
    { to: '/returns', label: 'Returns', desc: 'Sales & customer returns' },
    { to: '/invoices', label: 'Invoices', desc: 'Sales invoice history' },
    { to: '/collections', label: 'Collections', desc: 'Field payment entries' },
    { to: '/cash-handover', label: 'Cash Handover', desc: 'Shift reconciliation' },
    { to: '/expenses', label: 'Expenses', desc: 'Operating costs & receipts' },
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
    : [];

  const handleSelectModule = (to) => {
    navigate(to);
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full shrink-0 items-center justify-between border-b border-border-soft bg-white px-4 sm:px-6 shadow-sm">
      {/* Left: Menu Toggle Button */}
      <div className="flex items-center gap-3">
        {/* Toggle on desktop (collapse/expand) and mobile (open drawer) */}
        <button
          onClick={() => {
            if (window.innerWidth >= 1024) {
              onToggleSidebar();
            } else {
              onToggleMobile();
            }
          }}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-lavender-100 hover:text-ink transition-colors"
          title="Toggle Navigation"
          aria-label="Toggle Navigation"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Center: Module Search Bar */}
      <div className="relative max-w-md flex-1 px-2 sm:px-4" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-light" size={16} />
          <input
            type="text"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => setShowSearchDropdown(true)}
            className="w-full rounded-full border border-border-soft bg-[#F7F5FF]/70 pl-10 pr-8 py-2 text-xs sm:text-sm text-ink placeholder:text-[#94A3B8] transition-all focus:bg-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setShowSearchDropdown(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-light hover:text-ink"
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

      {/* Right Actions: Branch Switcher, Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Branch Selector Pill */}
        {canSwitch && branches.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-full border border-border-soft bg-white px-3 py-1.5 shadow-sm hover:border-primary/40 transition-colors">
            <MapPin size={14} className="text-primary shrink-0" />
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
            <ChevronDown size={12} className="text-ink-muted pointer-events-none -ml-3" />
          </div>
        )}

        {/* User Profile Pill & Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 rounded-full p-1 sm:px-2 sm:py-1 hover:bg-lavender-50 transition-colors"
          >
            {/* Circular Purple Avatar */}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8244AD] text-xs font-bold text-white shadow-soft">
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
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border-soft bg-white p-2 shadow-soft-lg z-50">
              <div className="border-b border-border-soft px-3 py-2">
                <div className="text-xs font-bold text-ink">{user?.name}</div>
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
      </div>
    </header>
  );
}
