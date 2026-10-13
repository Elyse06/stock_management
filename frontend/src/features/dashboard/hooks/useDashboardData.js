import { useQueries } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/config/endpoints";
import { apiClient } from "@/lib/api/client";

const BLOCS = {
  kpis: "kpis/",
  topConsommes: "top-consommes/",
  produitsDormants: "produits-dormants/",
  evolutionStock: "evolution-stock/",
  consommationMensuelle: "consommation-mensuelle/",
  repartitionCategorie: "repartition-categorie/",
  repartitionMagasin: "repartition-magasin/",
};

/**
 * Données du tableau de bord : une requête par bloc, chargées en parallèle et
 * mises en cache. Un bloc en erreur n'empêche plus l'affichage des autres
 * (auparavant un seul Promise.all faisait tout échouer).
 */
export function useDashboardData(enabled = true) {
  const entrees = Object.entries(BLOCS);
  const resultats = useQueries({
    queries: entrees.map(([cle, chemin]) => ({
      queryKey: ["dashboard", cle],
      queryFn: ({ signal }) => apiClient.get(`${API_ENDPOINTS.DASHBOARD}${chemin}`, { signal }).then((r) => r.data),
      staleTime: 60 * 1000,
      enabled,
    })),
  });

  const donnees = Object.fromEntries(entrees.map(([cle], i) => [cle, resultats[i].data ?? (cle === "kpis" ? null : [])]));
  return {
    ...donnees,
    loading: resultats.some((r) => r.isLoading),
    enErreur: resultats.some((r) => r.isError),
  };
}
