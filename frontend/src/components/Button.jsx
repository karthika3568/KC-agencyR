const VARIANT_CLASSES = {
  primary: 'bg-[#6F2DA8] text-white hover:bg-[#5C238C] shadow-sm disabled:opacity-40',
  secondary: 'bg-white text-[#17233D] border border-[#E5E7F5] hover:bg-[#F7F5FF] hover:border-[#DDD0FF] disabled:opacity-40',
  danger: 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 disabled:opacity-40',
  ghost: 'text-[#697797] hover:text-[#17233D] hover:bg-[#EEE5FF]/60 disabled:opacity-40',
  gold: 'bg-[#6F2DA8] text-white hover:bg-[#5C238C] shadow-sm disabled:opacity-40',
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
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  const sizeClasses = size === 'sm' ? 'px-3 py-1.5 text-xs' : size === 'lg' ? 'px-5 py-2.5 text-sm' : 'px-4 py-2 text-sm';

  return (
    <button
      disabled={disabled || Boolean(loading)}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#6F2DA8] focus:ring-offset-1 disabled:cursor-not-allowed ${sizeClasses} ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon
      )}
      <span>{children}</span>
      {shortcut && (
        <span className="ml-1 rounded bg-black/10 px-1.5 py-0.5 text-[10px] font-medium opacity-80">{shortcut}</span>
      )}
    </button>
  );
}
