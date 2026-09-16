import { useState, useCallback, useMemo } from "react";

export function useFilters(initialFilters = {}) {
  const [filters, setFilters] = useState(initialFilters);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      const initialValue = initialFilters[key];
      return value !== initialValue && value !== "" && value !== null && value !== undefined;
    });
  }, [filters, initialFilters]);

  const getActiveFiltersCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      const initialValue = initialFilters[key];
      return value !== initialValue && value !== "" && value !== null && value !== undefined;
    }).length;
  }, [filters, initialFilters]);

  return {
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    hasActiveFilters,
    activeFiltersCount: getActiveFiltersCount,
  };
}