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
    <footer className="flex items-center justify-between border-t border-border-soft bg-white px-4 py-2 text-xs text-ink-muted">
      <span>AJ Agency v1.0.0 &middot; Distributor Billing &amp; Inventory</span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-success" />
        Online
      </span>
      <span>{formatted}</span>
    </footer>
  );
}
