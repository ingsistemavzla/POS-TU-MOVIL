import { useState, useEffect, useMemo } from 'react';

export const CLIENT_PAGE_SIZE = 20;

export function useClientPagination<T>(
  items: T[],
  pageSize: number = CLIENT_PAGE_SIZE,
  resetKey?: string
) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [resetKey]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const safePage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const rangeStart = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, totalCount);

  return {
    paginatedItems,
    currentPage: safePage,
    totalPages,
    totalCount,
    pageSize,
    rangeStart,
    rangeEnd,
    setPage: setCurrentPage,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
}
