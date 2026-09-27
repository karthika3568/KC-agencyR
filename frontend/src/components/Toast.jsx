import { CheckCircle2, X } from 'lucide-react';

/** Small floating success toast, auto-dismissed by the caller (setTimeout clearing the message state). */
export function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
      <span>{message}</span>
      {onClose && (
        <button type="button" onClick={onClose} className="ml-1 text-emerald-600 hover:text-emerald-800">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
