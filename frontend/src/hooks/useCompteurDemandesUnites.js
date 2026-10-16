import { useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/config/endpoints";
import { apiClient } from "@/lib/api/client";

export function useCompteurDemandesUnites(enabled) {
  const { data = 0 } = useQuery({
    queryKey: ["demandes-unites", "compteur"],
    queryFn: ({ signal }) => apiClient.get(`${API_ENDPOINTS.DEMANDES_UNITES}compteur/`, { signal }).then((r) => r.data.en_attente),
    enabled,
    refetchInterval: 60_000,
  });
  return data;
}
