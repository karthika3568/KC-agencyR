import { useEffect, useState } from 'react';

/** Thin persistent status bar — app name/version, online indicator, live clock. */
export function StatusFooter() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const formatted = now.toLocaleString(undefined, {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <footer className="flex shrink-0 items-center justify-between border-t border-border-soft bg-white/80 px-5 py-2 text-[11px] font-medium text-ink-muted backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-ink">KC Agency</span>
        <span>&middot;</span>
        <span className="hidden sm:inline">Distributor Billing &amp; Inventory</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Online
        </span>
        <span className="text-ink-light hidden sm:inline">&middot;</span>
        <span className="hidden sm:inline text-ink-muted">{formatted}</span>
      </div>
    </footer>
  );
}
