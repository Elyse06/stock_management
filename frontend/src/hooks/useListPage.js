import { useState, useCallback, useEffect } from "react";
import { usePagination } from "./usePagination";

export function useListPage(apiEndpoint, options = {}) {
  const { paginationModel, resetPage } = usePagination(options.pageSize || 25);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rowCount, setRowCount] = useState(0);
  const [filters, setFilters] = useState(options.initialFilters || {});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
        ...filters,
      };

      const { data } = await options.apiClient.get(apiEndpoint, { params });
      setItems(data.results ?? data);
      setRowCount(data.count ?? (data.results ?? data).length);
    } catch (err) {
      setError(options.errorMessage || "Impossible de charger les données.");
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, paginationModel, filters, options]);

  useEffect(() => {
    load();
  }, [load]);

  const updateFilters = useCallback(
    (newFilters) => {
      setFilters(newFilters);
      resetPage();
    },
    [resetPage]
  );

  const resetFilters = useCallback(() => {
    setFilters(options.initialFilters || {});
    resetPage();
  }, [options.initialFilters, resetPage]);

  return {
    items,
    loading,
    error,
    rowCount,
    paginationModel,
    filters,
    load,
    updateFilters,
    resetFilters,
    setError,
  };
}