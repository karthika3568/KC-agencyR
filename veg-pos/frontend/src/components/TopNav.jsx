import { useState } from 'react';
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleLinks = LINKS.filter((l) => !l.adminOnly || user?.role === 'admin');

  return (
    <nav className="no-print bg-[#0a1733] text-white shadow-md border-b border-blue-950 sticky top-0 z-40">
      <div className="flex items-center justify-between px-3.5 py-2 max-w-7xl mx-auto">
        {/* Brand / Company Name with balanced margin */}
        <NavLink
          to="/"
          className="font-bold text-sm sm:text-base whitespace-nowrap hover:text-blue-200 transition-colors tracking-tight mr-4 lg:mr-6 shrink-0 flex items-center gap-2"
          title={companyName || t('app_title')}
        >
          <span>{companyName || t('app_title')}</span>
        </NavLink>

        {/* Desktop Navigation Links - Balanced Gaps, Zero Collision, No Scroll */}
        <div className="hidden md:flex items-center gap-1 lg:gap-2 flex-1 justify-center">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                'px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-all ' +
                (isActive
                  ? 'bg-blue-100 text-slate-900 font-bold shadow-sm'
                  : 'text-white/85 hover:text-white hover:bg-white/10 font-medium')
              }
            >
              {t(`nav.${link.key}`)}
            </NavLink>
          ))}
        </div>

        {/* Right Section: Desktop Logout & Mobile Hamburger */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Desktop Logout Button */}
          <button
            onClick={logout}
            title={t('nav.logout')}
            aria-label={t('nav.logout')}
            className="hidden md:flex p-1.5 rounded-md text-white/85 hover:text-white hover:bg-white/15 transition-colors items-center justify-center border border-white/20"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
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

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/15 border border-white/20 focus:outline-none"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu (Responsive Web App / PWA friendly) */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0c1d42] border-t border-blue-900/60 px-3 py-2 space-y-1 shadow-lg animate-fadeIn">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                'block px-3 py-2 rounded-lg text-sm font-medium transition-all ' +
                (isActive
                  ? 'bg-blue-100 text-slate-900 font-bold shadow-xs'
                  : 'text-white/90 hover:text-white hover:bg-white/10')
              }
            >
              {t(`nav.${link.key}`)}
            </NavLink>
          ))}

          {/* Mobile Logout Row */}
          <div className="pt-2 mt-1 border-t border-blue-900/50">
            <button
              onClick={() => {
                setMobileOpen(false);
                logout();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-red-300 hover:bg-white/10 font-medium"
            >
              <span>{t('nav.logout')}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
