import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchPage } from "@/lib/api/pagination";

import { usePagination } from "./usePagination";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";

export function usePaginatedList(baseKey, endpoint, filters = {}, options = {}) {
  const { pageSize = DEFAULT_PAGE_SIZE, enabled = true, select } = options;
  const { paginationModel, setPaginationModel } = usePagination(pageSize, filters);

  const query = useQuery({
    queryKey: [...baseKey, "list", filters, paginationModel],
    queryFn: ({ signal }) => fetchPage(endpoint, { ...filters, ...paginationModel }, { signal }),
    placeholderData: keepPreviousData,
    enabled,
    select,
  });

  const rows = query.data?.rows ?? [];
  const rowCount = query.data?.count ?? 0;
  const loading = query.isLoading || query.isPlaceholderData;

  return {
    ...query,
    rows,
    rowCount,
    loading,
    paginationModel,
    setPaginationModel,
    gridProps: {
      rows,
      rowCount,
      loading,
      paginationModel,
      onPaginationModelChange: setPaginationModel,
    },
  };
}
