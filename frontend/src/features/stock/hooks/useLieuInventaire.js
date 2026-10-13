import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS } from "@/config/endpoints";
import { useDirections, useMagasins, useSalles, useSites } from "@/hooks/useReferenceData";
import { apiClient } from "@/lib/api/client";
import { aujourdhuiISO } from "@/utils/periodes";

const idDe = (lieuType, lieu) => (lieuType === "magasin" ? lieu.magasin_id : lieu.site_id);

/**
 * Choix du lieu inventorié : magasin, agence, ou direction / salle du Siège.
 * Fournit aussi les stocks théoriques du lieu à la date du jour.
 */
export function useLieuInventaire() {
  const { data: magasins = [] } = useMagasins();
  const { data: sites = [] } = useSites();
  const { data: directions = [] } = useDirections();
  const { data: salles = [] } = useSalles();

  const [lieuType, setLieuTypeState] = useState("magasin");
  const [lieuId, setLieuIdState] = useState("");
  const [scopeType, setScopeTypeState] = useState("");
  const [scopeId, setScopeId] = useState("");

  const setLieuType = (value) => {
    setLieuTypeState(value);
    setLieuIdState("");
    setScopeTypeState("");
    setScopeId("");
  };
  const setLieuId = (value) => {
    setLieuIdState(value);
    setScopeTypeState("");
    setScopeId("");
  };
  const setScopeType = (value) => {
    setScopeTypeState(value);
    setScopeId("");
  };

  const lieux = lieuType === "magasin" ? magasins : sites;
  const lieu = lieux.find((l) => String(idDe(lieuType, l)) === String(lieuId));
  const estSiege = lieuType === "site" && lieu?.site_type === "SIEGE";
  // Les directions ne sont plus rattachées à un site : toutes sont proposées au Siège.
  const scopes = scopeType === "direction" ? directions : salles.filter((s) => String(s.localite) === String(lieuId));
  const scope = scopes.find((s) => String(scopeType === "direction" ? s.dir_id : s.salle_id) === String(scopeId));

  /** Cible réelle de l'inventaire : ``{type, id}`` ou ``null`` si incomplète. */
  const cible = useMemo(() => {
    if (!lieuId || !lieu) return null;
    if (lieuType === "magasin") return { type: "magasin", id: lieuId };
    if (!estSiege) return { type: "site", id: lieuId };
    return scopeType && scopeId ? { type: scopeType, id: scopeId } : null;
  }, [lieuId, lieu, lieuType, estSiege, scopeType, scopeId]);

  const nom = !cible
    ? ""
    : cible.type === "magasin"
      ? lieu.magasin_nom
      : cible.type === "site"
        ? lieu.site_nom
        : cible.type === "direction"
          ? scope?.dir_libelle
          : scope?.nom;

  const stocks = useQuery({
    queryKey: ["inventaire", "stocks-lieu", cible],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get(API_ENDPOINTS.HISTORIQUE_LOCALISATION, {
        params: { date: aujourdhuiISO(), [`${cible.type}_id`]: cible.id },
        signal,
      });
      return Object.fromEntries((data ?? []).map((s) => [s.article_code, s.stock]));
    },
    enabled: Boolean(cible),
    staleTime: 0,
  });

  /** Corps de requête identifiant le lieu pour la création de la session. */
  const payloadLieu = () => {
    if (!cible) return {};
    const cle = { magasin: "magasin", site: "site", direction: "service", salle: "salle" }[cible.type];
    return { [cle]: cible.type === "direction" ? cible.id : Number(cible.id) };
  };

  /** Filtre des unités d'un article pour ce lieu. */
  const filtreUnites = () => {
    if (!cible) return {};
    if (cible.type === "magasin") return { statut: "EN_STOCK" };
    return { statut: "ATTRIBUE", [`localisation_${cible.type}_id`]: cible.id };
  };

  return {
    lieuType, setLieuType, lieuId, setLieuId, scopeType, setScopeType, scopeId, setScopeId,
    lieux, lieu, estSiege, scopes, cible, nom,
    stocksTheoriques: stocks.data ?? {},
    loadingStocks: stocks.isFetching,
    stocksError: stocks.error,
    payloadLieu,
    filtreUnites,
  };
}
