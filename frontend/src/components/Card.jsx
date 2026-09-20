/** Consistent white rounded card wrapper used across every panel/table/list in the app. */
export function Card({ children, className = '', title, actions }) {
  if (!title && !actions) {
    return <div className={`card ${className}`}>{children}</div>;
  }
  return (
    <div className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-border-soft px-4 py-3">
          {title && <span className="font-semibold text-ink">{title}</span>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
