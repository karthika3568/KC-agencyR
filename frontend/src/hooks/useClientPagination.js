import { useState, useMemo, useEffect } from 'react';

/**
 * Reusable hook for fixed 10-record pagination on in-memory / pre-fetched arrays.
 * Handles automatic page clamping, empty page recovery on deletes/filters, and slicing.
 */
export function useClientPagination(items = [], pageSize = 10) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // If page exceeds totalPages (e.g., after deletion or filter), clamp to last valid page
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  const safePage = Math.min(Math.max(1, page), totalPages);

  const pagedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const resetPage = () => setPage(1);

  return {
    page: safePage,
    setPage,
    resetPage,
    pageSize,
    total,
    totalPages,
    pagedItems,
    paginatedItems: pagedItems,
  };
}
