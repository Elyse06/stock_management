import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useNotification } from "@/hooks/useNotification";
import { MESSAGES } from "@/constants/messages";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useArticles, useDirections, useEmployees, useSalles, useSites } from "@/hooks/useReferenceData";
import { getErrorMessage } from "@/lib/api/errors";

import { commandesApi } from "../api/commandesApi";
import { OBJET_PAR_DEFAUT } from "../constants/commande";
import { attributionPayload } from "../utils/attributions";

const ligneVide = () => ({ article: "", article_designation: "", quantite: 1, attributions: [] });

/** État et envoi du formulaire de nouvelle commande. */
export function useCommandeForm({ isOpen, onDone }) {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { user } = usePermission();
  const enabled = { enabled: isOpen };
  const { data: articles = [] } = useArticles({}, enabled);
  // Employés proposés comme bénéficiaires des attributions.
  const { data: employees = [] } = useEmployees(enabled);
  const { data: directions = [] } = useDirections(enabled);
  const { data: sites = [] } = useSites(enabled);
  const { data: salles = [] } = useSalles(enabled);
  const [etape, setEtape] = useState(0);
  const [objet, setObjet] = useState(OBJET_PAR_DEFAUT);
  const [lignes, setLignes] = useState([ligneVide()]);

  useEffect(() => {
    if (!isOpen) return;
    setEtape(0);
    setObjet(OBJET_PAR_DEFAUT);
    setLignes([ligneVide()]);
  }, [isOpen]);

  // Employé lié au compte, fourni par /api/auth/me/ (null si aucun).
  const demandeur = user?.employe ?? null;
  const lignesValides = lignes.filter((l) => l.article && Number(l.quantite) > 0);

  const mutation = useMutation({
    mutationFn: (payload) => commandesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commandes"] });
      notify.success("Commande créée avec succès");
      onDone?.();
    },
    onError: (error) => notify.error(getErrorMessage(error, MESSAGES.SAVE_FAILED)),
  });

  const allerAuRecap = () => {
    if (lignesValides.length === 0) return notify.error("Ajoutez au moins un article à la commande.");
    if (lignesValides.some((l) => !Number.isInteger(Number(l.quantite)))) return notify.error("Les quantités doivent être des nombres entiers.");
    setEtape(1);
  };

  const enregistrer = () => {
    if (lignesValides.length === 0) return notify.error("Ajoutez au moins un article à la commande.");
    if (!demandeur) {
      return notify.error("Votre compte utilisateur n'est pas lié à un employé. Veuillez contacter l'administrateur.");
    }
    mutation.mutate({
      objet: objet.trim(),
      employe_demandeur: demandeur.emp_id,
      details: lignesValides.map((l) => ({
        article: l.article,
        quantite: Number(l.quantite),
        ...(l.attributions.length > 0 ? { attributions: l.attributions.map(attributionPayload) } : {}),
      })),
    });
  };

  return {
    etape,
    setEtape,
    objet,
    setObjet,
    lignes,
    lignesValides,
    references: { articles, employees, directions, sites, salles },
    demandeur,
    demandeurIntrouvable: Boolean(user) && !demandeur,
    modifierLigne: (index, changes) => setLignes((prev) => prev.map((l, i) => (i === index ? { ...l, ...changes } : l))),
    ajouterLigne: () => setLignes((prev) => [...prev, ligneVide()]),
    retirerLigne: (index) =>
      setLignes((prev) => {
        const restantes = prev.filter((_, i) => i !== index);
        return restantes.length > 0 ? restantes : [ligneVide()];
      }),
    allerAuRecap,
    enregistrer,
    saving: mutation.isPending,
  };
}
