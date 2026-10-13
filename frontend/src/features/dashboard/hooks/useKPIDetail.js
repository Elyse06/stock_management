import { useEffect, useState } from "react";

import { API_ENDPOINTS } from "@/config/endpoints";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePaginatedList } from "@/hooks/usePaginatedList";

import { KPI_CONFIG, moisCourant } from "../constants/kpis";

/** Liste paginée du détail d'un indicateur (recherche temporisée, filtre par mois). */
export function useKPIDetail(kpiType, isOpen) {
  const config = KPI_CONFIG[kpiType];
  const [search, setSearch] = useState("");
  const [mois, setMois] = useState(moisCourant);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    if (!isOpen) return;
    setSearch("");
    setMois(moisCourant());
  }, [isOpen, kpiType]);

  const list = usePaginatedList(
    ["dashboard", "detail", kpiType],
    `${API_ENDPOINTS.DASHBOARD}${config?.path ?? ""}`,
    { search: config?.searchable ? debouncedSearch : "", mois: config?.parMois ? mois : "" },
    { enabled: Boolean(isOpen && config) },
  );

  return { config, list, search, setSearch, mois, setMois, totalQuantite: list.data?.total_quantite ?? 0 };
}
