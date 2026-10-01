import { useState, useCallback, useRef } from "react";
import { apiClient } from "../../../api/client";

const TAILLE_MAX = 10 * 1024 * 1024; // 10 Mo
const ETAPES = { CHOIX: "choix", APERCU: "apercu", CONFIRME: "confirme" };

// Identifie une correspondance de manière unique par son type + libellé
// (ex: "DIRECTION::DSI"). Plusieurs lignes qui pointent vers la même
// correspondance partagent la même clé, et donc la même confirmation.
function cleSuggestion(suggestion) {
  return `${suggestion.type}::${suggestion.libelle}`;
}

async function envoyerFichier(fichier, dryRun, signal, lignesConfirmees) {
  const formData = new FormData();
  formData.append("fichier", fichier);
  formData.append("dry_run", dryRun ? "true" : "false");
  if (lignesConfirmees && lignesConfirmees.length > 0) {
    formData.append("lignes_confirmees", JSON.stringify(lignesConfirmees));
  }

  const { data } = await apiClient.post(
    "/api/stock/import-immobilisations/",
    formData,
    { signal }
  );
  return data;
}

export function useImportImmobilisations() {
  const [fichier, setFichier] = useState(null);
  const [rapport, setRapport] = useState(null);
  const [etape, setEtape] = useState(ETAPES.CHOIX);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);
  // Clés ("TYPE::libellé") des correspondances confirmées. Une clé confirmée
  // s'applique à TOUTES les lignes qui partagent cette même correspondance.
  const [clesConfirmees, setClesConfirmees] = useState(new Set());
  const abortRef = useRef(null);

  const choisirFichier = useCallback((f) => {
    if (!f) {
      setFichier(null);
      setRapport(null);
      setEtape(ETAPES.CHOIX);
      setErreur(null);
      setClesConfirmees(new Set());
      return;
    }
    if (f.size > TAILLE_MAX) {
      setErreur("Fichier trop volumineux (max 10 Mo).");
      return;
    }
    if (!/\.xlsx?$/i.test(f.name)) {
      setErreur("Format non supporté. Seuls .xlsx et .xls sont acceptés.");
      return;
    }
    setFichier(f);
    setRapport(null);
    setEtape(ETAPES.CHOIX);
    setErreur(null);
    setClesConfirmees(new Set());
  }, []);

  const basculerConfirmationCle = useCallback((cle, confirmee) => {
    setClesConfirmees((precedent) => {
      const suivant = new Set(precedent);
      if (confirmee) {
        suivant.add(cle);
      } else {
        suivant.delete(cle);
      }
      return suivant;
    });
  }, []);

  const previsualiser = useCallback(async () => {
    if (!fichier) return;
    setLoading(true);
    setErreur(null);
    abortRef.current = new AbortController();
    try {
      const resultat = await envoyerFichier(
        fichier,
        true,
        abortRef.current.signal
      );
      setRapport(resultat);
      setEtape(ETAPES.APERCU);
      // Toute correspondance trouvée est cochée par défaut : seules les
      // lignes vraiment sans correspondance restent "à traiter".
      const clesTrouvees = new Set(
        (resultat.details || [])
          .filter((l) => l.statut === "A_TRAITER" && l.suggestion)
          .map((l) => cleSuggestion(l.suggestion))
      );
      setClesConfirmees(clesTrouvees);
    } catch (e) {
      if (e.name === "CanceledError" || e.code === "ERR_CANCELED") return;
      const message =
        e.response?.data?.detail || e.message || "Impossible d'analyser le fichier.";
      setErreur(message);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [fichier]);

  const confirmer = useCallback(async () => {
    if (!fichier) return;
    setLoading(true);
    setErreur(null);
    abortRef.current = new AbortController();
    try {
      // On déplie les clés confirmées vers la liste de toutes les lignes
      // concernées (plusieurs lignes peuvent partager la même clé).
      const lignesAEnvoyer = (rapport?.details || [])
        .filter(
          (l) =>
            l.statut === "A_TRAITER" &&
            l.suggestion &&
            clesConfirmees.has(cleSuggestion(l.suggestion))
        )
        .map((l) => l.ligne);

      const resultat = await envoyerFichier(
        fichier,
        false,
        abortRef.current.signal,
        lignesAEnvoyer
      );
      setRapport(resultat);
      setEtape(ETAPES.CONFIRME);
    } catch (e) {
      if (e.name === "CanceledError" || e.code === "ERR_CANCELED") return;
      const message =
        e.response?.data?.detail || e.message || "Impossible de confirmer l'import.";
      setErreur(message);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [fichier, rapport, clesConfirmees]);

  const annuler = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const recommencer = useCallback(() => {
    setFichier(null);
    setRapport(null);
    setEtape(ETAPES.CHOIX);
    setErreur(null);
    setClesConfirmees(new Set());
  }, []);

  // Le bouton "Confirmer l'import" doit pouvoir être cliqué dès qu'il y a
  // quelque chose à importer : soit des lignes déjà OK (sans affectation),
  // soit au moins une correspondance confirmée par l'utilisateur.
  const peutConfirmer = (rapport?.lignes_ok ?? 0) > 0 || clesConfirmees.size > 0;

  return {
    fichier,
    rapport,
    etape,
    loading,
    erreur,
    ETAPES,
    clesConfirmees,
    basculerConfirmationCle,
    peutConfirmer,
    choisirFichier,
    previsualiser,
    confirmer,
    annuler,
    recommencer,
  };
}