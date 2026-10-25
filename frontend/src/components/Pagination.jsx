import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Shared Pagination component adhering strictly to project requirements:
 * - Exactly 10 records per page (fixed, no page size selector).
 * - If total <= 10 records: displays nothing (avoids unnecessary pagination controls).
 * - If total > 10 records: displays pagination controls with record range, total count,
 *   previous/next buttons, and numbered page navigation with ellipsis windowing.
 * - Purple/lavender styling matching the KC Agency theme.
 */
export function Pagination({ page = 1, pageSize = 10, total = 0, onPageChange }) {
  if (total <= pageSize) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, total);

  // Generate numbered pages with smart windowing
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const rangeStart = Math.max(2, currentPage - 1);
      const rangeEnd = Math.min(totalPages - 1, currentPage + 1);

      for (let i = rangeStart; i <= rangeEnd; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border-soft px-3.5 py-2 text-xs bg-surface-subtle/10 select-none">
      <div className="text-ink-muted font-medium">
        Showing <span className="font-semibold text-ink">{startRecord}</span>–<span className="font-semibold text-ink">{endRecord}</span> of <span className="font-semibold text-ink">{total}</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          data-catalog-nav="true"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="inline-flex items-center gap-1 rounded-lg border border-border-soft px-2 py-1 text-ink transition-colors hover:bg-lavender-100/60 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent focus:outline-none focus:ring-2 focus:ring-[#6F2DA8] focus:ring-offset-1"
        >
          <ChevronLeft size={13} />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) =>
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-ink-muted">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                data-catalog-nav="true"
                onClick={() => onPageChange(p)}
                aria-current={p === currentPage ? 'page' : undefined}
                className={`min-w-[28px] h-7 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#6F2DA8] focus:ring-offset-1 ${
                  p === currentPage
                    ? 'bg-primary text-white shadow-xs'
                    : 'border border-border-soft text-ink hover:bg-lavender-100/60'
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          data-catalog-nav="true"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="inline-flex items-center gap-1 rounded-lg border border-border-soft px-2 py-1 text-ink transition-colors hover:bg-lavender-100/60 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent focus:outline-none focus:ring-2 focus:ring-[#6F2DA8] focus:ring-offset-1"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
