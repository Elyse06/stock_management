import { useEffect, useState } from "react";

import { API_ENDPOINTS } from "@/config/endpoints";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { cleanParams } from "@/lib/api/pagination";

import { KPI_CONFIG, moisCourant } from "../constants/kpis";

/** Liste paginée du détail d'un indicateur (recherche temporisée, filtre par mois). */
export function useKPIDetail(kpiType, isOpen) {
  const config = KPI_CONFIG[kpiType];
  const [search, setSearch] = useState("");
  const [mois, setMois] = useState(moisCourant);
  const [typeArticle, setTypeArticle] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    if (!isOpen) return;
    setSearch("");
    setMois(moisCourant());
    setTypeArticle("");
  }, [isOpen, kpiType]);

  const url = `${API_ENDPOINTS.DASHBOARD}${config?.path ?? ""}`;
  const filtres = { search: config?.searchable ? debouncedSearch : "", mois: config?.parMois ? mois : "", is_immobilisation: typeArticle };
  const list = usePaginatedList(["dashboard", "detail", kpiType], url, filtres, { enabled: Boolean(isOpen && config) });
  // Rapport PDF : la liste complète avec les mêmes filtres.
  const urlPdf = `${url}?${new URLSearchParams(cleanParams({ ...filtres, export: "pdf" }))}`;

  return {
    config, list, urlPdf, search, setSearch, mois, setMois, typeArticle, setTypeArticle,
    totalQuantite: list.data?.total_quantite ?? 0,
  };
}
