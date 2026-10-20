import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { MESSAGES } from "@/constants/messages";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { useNotification } from "@/hooks/useNotification";
import { useArticles, useDirections, useEmployees, useSalles, useSites } from "@/hooks/useReferenceData";
import { getErrorMessage } from "@/lib/api/errors";

import { commandesApi } from "../api/commandesApi";
import { erreurLigne, formulaireVide, nouvelleCle, payloadCommande } from "../utils/nouvelleCommande";

/**
 * État de la page « Nouvelle commande » : le formulaire d'une ligne (à gauche), la liste des lignes
 * ajoutées (à droite). Cliquer une ligne de la liste la recharge dans le formulaire pour la modifier.
 */
export function useNouvelleCommande({ onEnregistree }) {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { user } = usePermission();
  const { data: articles = [] } = useArticles({});
  const { data: employees = [] } = useEmployees();
  const { data: directions = [] } = useDirections();
  const { data: sites = [] } = useSites();
  const { data: salles = [] } = useSalles();

  const [form, setForm] = useState(() => formulaireVide());
  const [enEdition, setEnEdition] = useState(null);
  const [erreur, setErreur] = useState("");
  const [lignes, setLignes] = useState([]);
  const [objet, setObjet] = useState("");
  const [erreurObjet, setErreurObjet] = useState("");

  // Employé lié au compte, fourni par /api/auth/me/ (null si aucun).
  const demandeur = user?.employe ?? null;

  const modifierForm = (changements) => {
    setForm((f) => ({ ...f, ...changements }));
    setErreur("");
  };

  const viderForm = (mode = form.mode) => {
    setForm(formulaireVide(mode));
    setEnEdition(null);
    setErreur("");
  };

  const validerLigne = () => {
    const message = erreurLigne(form, lignes, enEdition);
    if (message) return setErreur(message);
    const ligne = { ...form, specification: form.specification.trim(), quantite: Number(form.quantite) };
    if (enEdition) {
      setLignes((prev) => prev.map((l) => (l.cle === enEdition ? { ...ligne, cle: enEdition } : l)));
    } else {
      setLignes((prev) => [...prev, { ...ligne, cle: nouvelleCle() }]);
    }
    // Le formulaire est vidé, prêt pour l'article suivant (même mode de saisie).
    viderForm(form.mode);
  };

  const editerLigne = (ligne) => {
    setForm({ mode: ligne.mode, article: ligne.article, specification: ligne.specification, quantite: ligne.quantite, attributions: ligne.attributions });
    setEnEdition(ligne.cle);
    setErreur("");
  };

  const retirerLigne = (cle) => {
    setLignes((prev) => prev.filter((l) => l.cle !== cle));
    if (cle === enEdition) viderForm();
  };

  const mutation = useMutation({
    mutationFn: (payload) => commandesApi.create(payload),
    onSuccess: (commande) => {
      queryClient.invalidateQueries({ queryKey: ["commandes"] });
      notify.success(commande?.commande_id ? `Commande n°${commande.commande_id} enregistrée.` : "Commande enregistrée.");
      onEnregistree?.(commande);
    },
    onError: (error) => notify.error(getErrorMessage(error, MESSAGES.SAVE_FAILED)),
  });

  const enregistrer = () => {
    if (!demandeur) return notify.error("Votre compte utilisateur n'est pas lié à un employé. Veuillez contacter l'administrateur.");
    if (!objet.trim()) {
      setErreurObjet("Indiquez l'objet de la demande.");
      return notify.error("Indiquez l'objet de la demande.");
    }
    if (lignes.length === 0) return notify.error("Ajoutez au moins un article à la commande.");
    if (enEdition) return notify.error("Terminez la modification en cours (« Mettre à jour la ligne ») ou annulez-la.");
    mutation.mutate(payloadCommande({ objet, lignes, demandeur }));
  };

  return {
    form,
    modifierForm,
    enEdition,
    erreur,
    validerLigne,
    annulerEdition: () => viderForm(),
    lignes,
    editerLigne,
    retirerLigne,
    objet,
    setObjet: (valeur) => {
      setObjet(valeur);
      setErreurObjet("");
    },
    erreurObjet,
    references: { articles, employees, directions, sites, salles },
    demandeur,
    demandeurIntrouvable: Boolean(user) && !demandeur,
    enregistrer,
    enregistrement: mutation.isPending,
  };
}
