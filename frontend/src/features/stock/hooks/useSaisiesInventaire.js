import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useNotification } from "@/hooks/useNotification";
import { API_ENDPOINTS } from "@/config/endpoints";
import { getErrorMessage } from "@/lib/api/errors";
import { fetchAllPages } from "@/lib/api/pagination";
import { MESSAGES } from "@/constants/messages";

import { inventairesApi } from "../api/stockApi";
import { construireLignes, estSaisie, SAISIE_VIDE, verifierSaisies } from "../utils/saisieInventaire";

/** Saisies, unités chargées à la demande et enregistrement d'une session d'inventaire. */
export function useSaisiesInventaire({ lieu, articles }) {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const [saisies, setSaisies] = useState({});
  const [unites, setUnites] = useState({});
  const [chargementUnites, setChargementUnites] = useState({});
  const [ligneOuverte, setLigneOuverte] = useState(null);

  const ciblecle = JSON.stringify(lieu.cible);
  // Changer de lieu repart d'une feuille vierge.
  useEffect(() => {
    setSaisies({});
    setUnites({});
    setLigneOuverte(null);
  }, [ciblecle]);

  const articlesParCode = useMemo(() => Object.fromEntries(articles.map((a) => [a.code_article, a])), [articles]);
  const stockTheorique = useCallback((code) => lieu.stocksTheoriques[code] ?? 0, [lieu.stocksTheoriques]);
  const getSaisie = useCallback((code) => saisies[code] ?? SAISIE_VIDE, [saisies]);

  const updateSaisie = useCallback(
    (code, patch) => setSaisies((prev) => ({ ...prev, [code]: { ...(prev[code] ?? SAISIE_VIDE), ...patch } })),
    [],
  );

  const chargerUnites = async (code) => {
    if (unites[code] || chargementUnites[code]) return;
    setChargementUnites((prev) => ({ ...prev, [code]: true }));
    try {
      const liste = await fetchAllPages(API_ENDPOINTS.UNITES_ARTICLE, { article: code, ...lieu.filtreUnites() });
      setUnites((prev) => ({ ...prev, [code]: liste }));
    } catch (error) {
      notify.error(getErrorMessage(error, "Impossible de charger les unités en stock."));
    } finally {
      setChargementUnites((prev) => ({ ...prev, [code]: false }));
    }
  };

  const basculerLigne = (article) => {
    const code = article.code_article;
    if (ligneOuverte === code) return setLigneOuverte(null);
    setLigneOuverte(code);
    if (article.is_immobilisation) chargerUnites(code);
  };

  const nbSaisies = useMemo(() => Object.values(saisies).filter(estSaisie).length, [saisies]);
  const nbEcarts = useMemo(
    () =>
      Object.entries(saisies).filter(
        ([code, s]) => s.quantite_physique !== "" && Number(s.quantite_physique) !== stockTheorique(code),
      ).length,
    [saisies, stockTheorique],
  );

  const enregistrement = useMutation({
    mutationFn: (payload) => inventairesApi.create(payload),
    onSuccess: () => {
      notify.success("Inventaire enregistré avec succès");
      setSaisies({});
      setLigneOuverte(null);
      queryClient.invalidateQueries({ queryKey: ["inventaires"] });
    },
    onError: (error) => notify.error(getErrorMessage(error, MESSAGES.SAVE_FAILED)),
  });

  const enregistrer = () => {
    if (!lieu.cible) return notify.error("Veuillez sélectionner un lieu.");
    const erreur = verifierSaisies(saisies, articlesParCode, stockTheorique);
    if (erreur) {
      notify.error(erreur.message);
      return setLigneOuverte(erreur.code);
    }
    const lignes = construireLignes(saisies, articlesParCode);
    if (lignes.length === 0) return notify.error("Renseignez au moins un article avant d'enregistrer.");
    enregistrement.mutate({ lignes, ...lieu.payloadLieu() });
  };

  return {
    saisies,
    getSaisie,
    updateSaisie,
    stockTheorique,
    unites,
    chargementUnites,
    ligneOuverte,
    basculerLigne,
    nbSaisies,
    nbEcarts,
    enregistrer,
    saving: enregistrement.isPending,
  };
}
