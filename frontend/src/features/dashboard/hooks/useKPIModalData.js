import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../api/client";

const KPI_ENDPOINTS = {
  total_articles: "/api/dashboard/kpis/articles/",
  produits_en_rupture: "/api/dashboard/kpis/ruptures/",
  produits_sous_seuil: "/api/dashboard/kpis/sous-seuil/",
  entrees_du_mois: "/api/dashboard/kpis/entrees-mois/",
  sorties_du_mois: "/api/dashboard/kpis/sorties-mois/",
};

export function useKPIModalData(kpiType, extraParams = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25 });
  const [rowCount, setRowCount] = useState(0);
  const [totalQuantite, setTotalQuantite] = useState(0);
  const [search, setSearch] = useState("");

  const endpoint = KPI_ENDPOINTS[kpiType];

  // ✅ CORRECTION ICI : Utiliser JSON.stringify pour extraParams
  const charger = useCallback(async () => {
    if (!endpoint) return;

    setLoading(true);
    setError("");
    try {
      const params = {
        page: pagination.page,
        page_size: pagination.pageSize,
        ...extraParams,
      };
      if (search) params.search = search;

      const { data: res } = await apiClient.get(endpoint, { params });
      setData(res.results ?? res);
      setRowCount(res.count ?? (res.results ?? res).length);
      setTotalQuantite(res.total_quantite ?? 0);
    } catch {
      setError("Impossible de charger les données.");
      setData([]);
      setRowCount(0);
    } finally {
      setLoading(false);
    }
  }, [endpoint, pagination.page, pagination.pageSize, search, JSON.stringify(extraParams)]);

  useEffect(() => {
    if (endpoint) {
      charger();
    }
  }, [charger, endpoint]);

  useEffect(() => {
    setData([]);
    setRowCount(0);
    setTotalQuantite(0);
    setPagination({ page: 1, pageSize: 25 });
    setSearch("");
    setError("");
  }, [kpiType]);

  const goToNextPage = () =>
    setPagination((prev) => ({ ...prev, page: prev.page + 1 }));

  const goToPrevPage = () =>
    setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }));

  const handleSearch = (value) => {
    setSearch(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return {
    data,
    loading,
    error,
    pagination,
    rowCount,
    totalQuantite,
    search,
    goToNextPage,
    goToPrevPage,
    handleSearch,
    charger,
  };
}