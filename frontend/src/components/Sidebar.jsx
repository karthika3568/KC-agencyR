import { NavLink } from 'react-router-dom';
import { Can } from './Can.jsx';

const MENU_ITEMS = [
  { to: '/', label: 'Dashboard', perm: 'dashboard.view_financial_summary' },
  { to: '/pos', label: 'POS', perm: 'pos.access' },
  { to: '/catalog', label: 'Catalog', perm: 'catalog.manage_items' },
  { to: '/parties', label: 'Parties', perm: 'parties.manage_customers' },
  { to: '/reports', label: 'Reports', perm: 'reports.view_all' },
  { to: '/staff', label: 'Staff & Permissions', perm: 'staff.manage_permissions' },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-200 bg-white">
      <div className="px-4 py-4 text-lg font-bold text-blue-700">POS System</div>
      <nav className="flex flex-col gap-1 px-2">
        {MENU_ITEMS.map((item) => (
          <Can key={item.to} perm={item.perm}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `rounded px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              {item.label}
            </NavLink>
          </Can>
        ))}
      </nav>
    </aside>
  );
}
