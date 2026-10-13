import { useQuery } from "@tanstack/react-query";

import { fetchAllPages } from "@/lib/api/pagination";

/**
 * Liste complète pour une liste déroulante (toutes les pages sont chargées).
 * Mise en cache 10 minutes et partagée entre les composants (même clé).
 *
 * >>> const { data: magasins = [] } = useOptions("magasins", API_ENDPOINTS.MAGASINS);
 */
export function useOptions(key, endpoint, params = {}, options = {}) {
  return useQuery({
    queryKey: ["options", key, params],
    queryFn: ({ signal }) => fetchAllPages(endpoint, params, { signal }),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}
