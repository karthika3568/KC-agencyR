const VARIANT_CLASSES = {
  gst: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'non-gst': 'bg-amber-50 text-amber-700 border border-amber-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border border-rose-200',
  neutral: 'bg-lavender-100 text-ink-muted border border-border-soft',
  gold: 'bg-primary-soft text-primary border border-lavender-300',
  primary: 'bg-primary-soft text-primary border border-lavender-300',
};

/** Small rounded status/type pill — GST vs Non-GST, payment status, active/inactive, etc. */
export function Badge({ variant = 'neutral', children, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.neutral} ${className}`}>
      {children}
    </span>
  );
}
