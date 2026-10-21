import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";

export function usePagination(initialPageSize = DEFAULT_PAGE_SIZE, resetOn) {
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: initialPageSize });

  const resetPage = useCallback(() => {
    setPaginationModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
  }, []);

  const signature = JSON.stringify(resetOn ?? null);
  const previous = useRef(signature);
  useEffect(() => {
    if (previous.current !== signature) {
      previous.current = signature;
      resetPage();
    }
  }, [signature, resetPage]);

  return { paginationModel, setPaginationModel, resetPage };
}
