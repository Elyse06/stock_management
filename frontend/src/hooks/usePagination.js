import { useState, useCallback } from "react";

export function usePagination(initialPageSize = 25) {
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: initialPageSize,
  });

  const resetPage = useCallback(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, []);

  const changePage = useCallback((newPage) => {
    setPaginationModel((prev) => ({ ...prev, page: newPage }));
  }, []);

  const changePageSize = useCallback((newPageSize) => {
    setPaginationModel({ page: 0, pageSize: newPageSize });
  }, []);

  return {
    paginationModel,
    setPaginationModel,
    resetPage,
    changePage,
    changePageSize,
  };
}