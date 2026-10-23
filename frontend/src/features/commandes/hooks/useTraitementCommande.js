import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useNotification } from "@/hooks/useNotification";
import { API_ENDPOINTS } from "@/config/endpoints";
import { useArticles } from "@/hooks/useReferenceData";
import { getErrorMessage } from "@/lib/api/errors";
import { fetchAllPages } from "@/lib/api/pagination";

import { associerArticle, COMMANDE_KEYS, traiterCommande } from "../api/commandesApi";
import { construirePayloadTraitement, estSuiviParSerie, validationsInitiales, verifierTraitement } from "../utils/traitementCommande";

import { useCommandeRoles } from "./useCommandeRoles";

/** Message selon le statut obtenu (une validation finale partielle laisse la commande « en cours »). */
function messageSucces(demande, obtenu) {
  if (obtenu === "REJETEE") return "Commande rejetée.";
  if (demande === "EN_COURS") return "Commande pré-validée.";
  if (demande === "REJETEE") return "Commande clôturée : le reste est refusé.";
  if (obtenu === "EN_COURS") return "Livraison enregistrée : la commande reste en cours pour les lignes en attente d'achat.";
  return "Commande validée.";
}

/**
 * État et envoi du traitement d'une commande dans la modale de détail. ``onCommandeModifiee`` reçoit la
 * commande à jour après le rattachement d'un nouvel article (les décisions en cours sont conservées).
 */
export function useTraitementCommande({ commande, isOpen, onDone, onCommandeModifiee }) {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const roles = useCommandeRoles();
  const { data: articles = [] } = useArticles({}, { enabled: isOpen });
  const [magasinSource, setMagasinSource] = useState("");
  const [unitesSelectionnees, setUnitesSelectionnees] = useState({});
  const [commentaire, setCommentaire] = useState("");
  const [validations, setValidations] = useState({});
  const [specifications, setSpecifications] = useState({});
  const commandeInitialisee = useRef(null);

  // Réinitialisé à l'ouverture d'une commande, pas quand elle est rechargée (rattachement d'un article).
  useEffect(() => {
    if (!isOpen || !commande) {
      commandeInitialisee.current = null;
      return;
    }
    if (commandeInitialisee.current === commande.commande_id) return;
    commandeInitialisee.current = commande.commande_id;
    setMagasinSource("");
    setUnitesSelectionnees({});
    setCommentaire("");
    setValidations(validationsInitiales(commande));
    setSpecifications({});
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
    mutationFn: ({ statut, payload }) => traiterCommande(commande.commande_id, payload).then((reponse) => ({ statut, reponse })),
    onSuccess: ({ statut, reponse }) => {
      COMMANDE_KEYS.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      queryClient.invalidateQueries({ queryKey: ["commandes", "livraisons", commande.commande_id] });
      notify.success(messageSucces(statut, reponse?.statut));
      onDone?.();
    },
    onError: (error) => notify.error(getErrorMessage(error, "Erreur lors du traitement.")),
  });

  const association = useMutation({
    mutationFn: ({ detailId, codeArticle }) => associerArticle(commande.commande_id, detailId, codeArticle),
    onSuccess: (commandeAJour) => {
      queryClient.invalidateQueries({ queryKey: ["commandes"] });
      notify.success("Article rattaché à la demande.");
      onCommandeModifiee?.(commandeAJour);
    },
    onError: (error) => notify.error(getErrorMessage(error, "Impossible de rattacher l'article.")),
  });

  const toggleUnite = (detailId, uniteId) =>
    setUnitesSelectionnees((prev) => {
      const courant = prev[detailId] || [];
      return { ...prev, [detailId]: courant.includes(uniteId) ? courant.filter((id) => id !== uniteId) : [...courant, uniteId] };
    });

  const traiter = (statut) => {
    const contexte = {
      statut, commande, commentaire, validations, magasinSource, unitesSelectionnees, getArticle, specifications,
      isAgentPrincipal: roles.isAgentPrincipal,
    };
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
    specifications,
    modifierSpecification: (detailId, texte) => setSpecifications((prev) => ({ ...prev, [detailId]: texte })),
    associer: (detailId, codeArticle) => association.mutate({ detailId, codeArticle }),
    association: association.isPending,
    traiter,
    traitement: mutation.isPending,
  };
}
