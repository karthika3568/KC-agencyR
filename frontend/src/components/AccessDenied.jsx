import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { getFirstAuthorizedRoute } from '../utils/navigationConfig';

export function AccessDenied({ requiredPerm, noPermissions = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const firstAuthorized = getFirstAuthorizedRoute(user);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-3xl border border-rose-200/60 bg-white p-6 sm:p-8 text-center shadow-soft-lg space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100/80 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 uppercase tracking-wider">
            <Lock className="w-3 h-3" />
            403 Forbidden
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-ink tracking-tight">
            Access Denied
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
            {noPermissions
              ? 'No permissions or modules have been assigned to your account. Please contact an administrator to configure your access.'
              : 'You do not have permission to access this module or page. This action has been logged for security.'}
          </p>
        </div>

        {user && (
          <div className="rounded-2xl border border-border-soft bg-surface-subtle/40 p-3 text-xs text-left flex items-center justify-between">
            <div>
              <div className="font-bold text-ink">{user.name}</div>
              <div className="text-[11px] text-ink-muted">{user.email}</div>
            </div>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-600 border border-indigo-100">
              {user.role}
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          {firstAuthorized && firstAuthorized !== window.location.pathname && (
            <button
              type="button"
              onClick={() => navigate(firstAuthorized)}
              className="w-full flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#8244AD] hover:bg-[#6F2DA8] px-4 py-2.5 text-xs font-bold text-white shadow-soft transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go to My Workspace</span>
            </button>
          )}

          <button
            type="button"
            onClick={logout}
            className="w-full flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border-soft hover:bg-surface-subtle px-4 py-2.5 text-xs font-bold text-ink-muted hover:text-ink transition-colors"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
