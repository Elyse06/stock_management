import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useNotification } from "@/hooks/useNotification";
import { API_ENDPOINTS } from "@/config/endpoints";
import { useArticles } from "@/hooks/useReferenceData";
import { getErrorMessage } from "@/lib/api/errors";
import { fetchAllPages } from "@/lib/api/pagination";

import { COMMANDE_KEYS, traiterCommande } from "../api/commandesApi";
import { construirePayloadTraitement, estSuiviParSerie, validationsInitiales, verifierTraitement } from "../utils/traitementCommande";

import { useCommandeRoles } from "./useCommandeRoles";

const SUCCES = { EN_COURS: "Commande pré-validée.", VALIDEE: "Commande validée.", REJETEE: "Commande rejetée." };

/** État et envoi du traitement d'une commande dans la modale de détail. */
export function useTraitementCommande({ commande, isOpen, onDone }) {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const roles = useCommandeRoles();
  const { data: articles = [] } = useArticles({}, { enabled: isOpen });
  const [magasinSource, setMagasinSource] = useState("");
  const [unitesSelectionnees, setUnitesSelectionnees] = useState({});
  const [commentaire, setCommentaire] = useState("");
  const [validations, setValidations] = useState({});

  useEffect(() => {
    if (!isOpen || !commande) return;
    setMagasinSource("");
    setUnitesSelectionnees({});
    setCommentaire("");
    setValidations(validationsInitiales(commande));
  }, [isOpen, commande]);

  const getArticle = (code) => articles.find((a) => a.code_article === code);
  const articlesSerie = useMemo(
    () => (commande?.details ?? []).map((d) => d.article).filter((code) => estSuiviParSerie(articles.find((a) => a.code_article === code))),
    [commande, articles],
  );

  // Unités en stock des articles suivis par numéro de série (toutes les pages).
  const unites = useQuery({
    queryKey: ["unites", "stock", articlesSerie],
    queryFn: async ({ signal }) => {
      const listes = await Promise.all(
        articlesSerie.map((code) => fetchAllPages(API_ENDPOINTS.UNITES_ARTICLE, { article: code, statut: "EN_STOCK" }, { signal })),
      );
      return Object.fromEntries(articlesSerie.map((code, i) => [code, listes[i]]));
    },
    enabled: Boolean(isOpen && magasinSource && articlesSerie.length > 0),
  });

  const mutation = useMutation({
    mutationFn: ({ statut, payload }) => traiterCommande(commande.commande_id, payload).then(() => statut),
    onSuccess: (statut) => {
      COMMANDE_KEYS.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      notify.success(SUCCES[statut]);
      onDone?.();
    },
    onError: (error) => notify.error(getErrorMessage(error, "Erreur lors du traitement.")),
  });

  const toggleUnite = (detailId, uniteId) =>
    setUnitesSelectionnees((prev) => {
      const courant = prev[detailId] || [];
      return { ...prev, [detailId]: courant.includes(uniteId) ? courant.filter((id) => id !== uniteId) : [...courant, uniteId] };
    });

  const traiter = (statut) => {
    const contexte = { statut, commande, commentaire, validations, magasinSource, unitesSelectionnees, getArticle, isAgentPrincipal: roles.isAgentPrincipal };
    const erreur = verifierTraitement(contexte);
    if (erreur) return notify.error(erreur);
    mutation.mutate({ statut, payload: construirePayloadTraitement(contexte) });
  };

  return {
    ...roles,
    articles,
    magasinSource,
    setMagasinSource,
    unitesDisponibles: unites.data ?? {},
    loadingUnites: unites.isLoading && unites.fetchStatus !== "idle",
    unitesSelectionnees,
    toggleUnite,
    commentaire,
    setCommentaire,
    validations,
    setValidations,
    traiter,
    traitement: mutation.isPending,
  };
}
