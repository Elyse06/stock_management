import { useEffect, useState } from "react";
import { apiClient } from "../../../api/client";

export function useDashboardData() {
  const [kpis, setKpis] = useState(null);
  const [topConsommes, setTopConsommes] = useState([]);
  const [produitsDormants, setProduitsDormants] = useState([]);
  const [evolutionStock, setEvolutionStock] = useState([]);
  const [consommationMensuelle, setConsommationMensuelle] = useState([]);
  const [repartitionCategorie, setRepartitionCategorie] = useState([]);
  const [repartitionMagasin, setRepartitionMagasin] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const chargerDonnees = async () => {
      setLoading(true);
      setError("");
      try {
        const [
          kpisRes,
          topConsommesRes,
          produitsDormantsRes,
          evolutionStockRes,
          consommationMensuelleRes,
          repartitionCategorieRes,
          repartitionMagasinRes,
        ] = await Promise.all([
          apiClient.get("/api/dashboard/kpis/"),
          apiClient.get("/api/dashboard/top-consommes/"),
          apiClient.get("/api/dashboard/produits-dormants/"),
          apiClient.get("/api/dashboard/evolution-stock/"),
          apiClient.get("/api/dashboard/consommation-mensuelle/"),
          apiClient.get("/api/dashboard/repartition-categorie/"),
          apiClient.get("/api/dashboard/repartition-magasin/"),
        ]);

        setKpis(kpisRes.data);
        setTopConsommes(topConsommesRes.data);
        setProduitsDormants(produitsDormantsRes.data);
        setEvolutionStock(evolutionStockRes.data);
        setConsommationMensuelle(consommationMensuelleRes.data);
        setRepartitionCategorie(repartitionCategorieRes.data);
        setRepartitionMagasin(repartitionMagasinRes.data);
      } catch {
        setError("Impossible de charger les données du tableau de bord.");
      } finally {
        setLoading(false);
      }
    };

    chargerDonnees();
  }, []);

  return {
    kpis,
    topConsommes,
    produitsDormants,
    evolutionStock,
    consommationMensuelle,
    repartitionCategorie,
    repartitionMagasin,
    loading,
    error,
  };
}