const VARIANT_CLASSES = {
  primary: 'bg-success text-white hover:bg-success/90 disabled:opacity-40',
  secondary: 'bg-white text-ink border border-border-soft hover:bg-page disabled:opacity-40',
  danger: 'bg-red-50 text-danger hover:bg-red-100 disabled:opacity-40',
  ghost: 'text-ink-muted hover:text-ink disabled:opacity-40',
  gold: 'bg-gold text-white hover:bg-gold-soft disabled:opacity-40',
};

/**
 * Shared button. `shortcut` renders a small pill (e.g. "F9") — only pass one
 * when the app genuinely wires that keyboard shortcut; never fabricate one.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  shortcut,
  className = '',
  children,
  ...props
}) {
  const sizeClasses = size === 'sm' ? 'px-3 py-1 text-xs' : size === 'lg' ? 'px-4 py-2.5 text-sm' : 'px-4 py-1.5 text-sm';

  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors ${sizeClasses} ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary} ${className}`}
      {...props}
    >
      {icon}
      <span>{children}</span>
      {shortcut && (
        <span className="ml-1 rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-medium opacity-80">{shortcut}</span>
      )}
    </button>
  );
}
