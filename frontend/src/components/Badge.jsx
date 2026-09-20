const VARIANT_CLASSES = {
  gst: 'bg-success-bg text-success',
  success: 'bg-success-bg text-success',
  'non-gst': 'bg-warning-bg text-warning',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-red-50 text-danger',
  neutral: 'bg-gray-100 text-ink-muted',
  gold: 'bg-gold/10 text-gold',
};

/** Small rounded status/type pill — GST vs Non-GST, payment status, active/inactive, etc. */
export function Badge({ variant = 'neutral', children, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.neutral} ${className}`}>
      {children}
    </span>
  );
}
