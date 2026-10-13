import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useNotification } from "@/hooks/useNotification";
import { MESSAGES } from "@/constants/messages";
import { useArticles } from "@/hooks/useReferenceData";
import { getErrorMessage } from "@/lib/api/errors";

import { mouvementsApi, STOCK_KEYS } from "../api/mouvementsApi";
import { ajouterNumeros, construirePayload, EMPTY_DETAIL, retirerNumero, validerMouvement } from "../utils/mouvementForm";

/** État et enregistrement du formulaire de mouvement. */
export function useMouvementForm({ isOpen, preselectedArticle, preselectedQuantite, onDone }) {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { data: articles = [] } = useArticles({}, { enabled: isOpen });
  const [type, setType] = useState("ENTREE");
  const [origine, setOrigine] = useState("");
  const [magasinSource, setMagasinSource] = useState("");
  const [magasinDestination, setMagasinDestination] = useState("");
  const [details, setDetails] = useState([{ ...EMPTY_DETAIL }]);

  useEffect(() => {
    if (!isOpen) return;
    setType("ENTREE");
    setOrigine("");
    setMagasinSource("");
    setMagasinDestination("");
    setDetails([{ ...EMPTY_DETAIL, ...(preselectedArticle ? { article: preselectedArticle, quantite: preselectedQuantite || 1 } : {}) }]);
  }, [isOpen, preselectedArticle, preselectedQuantite]);

  const getArticle = (code) => articles.find((a) => a.code_article === code);
  const modifierLigne = (index, transformer) =>
    setDetails((prev) => prev.map((d, i) => (i === index ? transformer(d) : d)));

  const mutation = useMutation({
    mutationFn: (payload) => mouvementsApi.create(payload),
    onSuccess: () => {
      STOCK_KEYS.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      notify.success("Mouvement enregistré avec succès");
      onDone?.();
    },
    onError: (error) => notify.error(getErrorMessage(error, MESSAGES.SAVE_FAILED)),
  });

  const etat = { type, origine, magasinSource, magasinDestination, details };

  const enregistrer = (event) => {
    event?.preventDefault();
    const erreur = validerMouvement(etat, getArticle);
    if (erreur) return notify.error(erreur);
    mutation.mutate(construirePayload(etat, getArticle));
  };

  return {
    ...etat,
    articles,
    getArticle,
    setType,
    setOrigine,
    setMagasinSource,
    setMagasinDestination,
    modifierLigne: (index, changes) => modifierLigne(index, (d) => ({ ...d, ...changes })),
    changerArticle: (index, article) =>
      modifierLigne(index, (d) => ({ ...d, article: article?.code_article ?? "", numeros_de_serie: [], quantite: 1 })),
    ajouterNumeros: (index, nouveaux) => modifierLigne(index, (d) => ajouterNumeros(d, nouveaux)),
    retirerNumero: (index, nsIndex) => modifierLigne(index, (d) => retirerNumero(d, nsIndex)),
    ajouterLigne: () => setDetails((prev) => [...prev, { ...EMPTY_DETAIL }]),
    retirerLigne: (index) => setDetails((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev)),
    totalUnites: details.reduce((sum, d) => sum + (Number(d.quantite) || 0), 0),
    enregistrer,
    saving: mutation.isPending,
  };
}
