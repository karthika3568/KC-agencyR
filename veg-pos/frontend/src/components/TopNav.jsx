import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.jsx';
import { useSettings } from '../hooks/useSettings.jsx';

const LINKS = [
  { to: '/', key: 'dashboard' },
  { to: '/billing', key: 'billing' },
  { to: '/items', key: 'items' },
  { to: '/parties', key: 'parties' },
  { to: '/payments', key: 'payments' },
  { to: '/purchases', key: 'purchases' },
  { to: '/invoices', key: 'invoices' },
  { to: '/reports', key: 'reports' },
  { to: '/settings', key: 'settings', adminOnly: true },
];

export default function TopNav() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { companyName } = useSettings();

  return (
    <nav className="no-print bg-brand-800 text-white shadow-md">
      <div className="flex items-center justify-between px-3 py-2">
        <NavLink
          to="/"
          className="font-bold text-lg whitespace-nowrap pr-4 hover:text-brand-100 transition-colors tracking-tight flex items-center gap-2"
          title={companyName || t('app_title')}
        >
          <span>{companyName || t('app_title')}</span>
        </NavLink>
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {LINKS.filter((l) => !l.adminOnly || user?.role === 'admin').map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  'px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ' +
                  (isActive ? 'bg-brand-600 font-semibold shadow-inner' : 'hover:bg-brand-700')
                }
              >
                {t(`nav.${link.key}`)}
              </NavLink>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 pl-3 whitespace-nowrap">
          <button
            onClick={logout}
            title={t('nav.logout')}
            aria-label={t('nav.logout')}
            className="p-1.5 rounded-md bg-brand-900/80 hover:bg-black/30 hover:text-red-300 transition-colors flex items-center justify-center text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
