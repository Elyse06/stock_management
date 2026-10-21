import { useQuery } from "@tanstack/react-query";

import { fetchAllPages } from "@/lib/api/pagination";

export function useOptions(key, endpoint, params = {}, options = {}) {
  return useQuery({
    queryKey: ["options", key, params],
    queryFn: ({ signal }) => fetchAllPages(endpoint, params, { signal }),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}
