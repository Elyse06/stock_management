import { useState, useCallback, useRef } from "react";
import { apiClient } from "../../../api/client";

const TAILLE_MAX = 10 * 1024 * 1024; // 10 Mo
const ETAPES = { CHOIX: "choix", APERCU: "apercu", CONFIRME: "confirme" };

async function envoyerFichier(fichier, dryRun, signal) {
  const formData = new FormData();
  formData.append("fichier", fichier);
  formData.append("dry_run", dryRun ? "true" : "false");

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
  const abortRef = useRef(null);

  const choisirFichier = useCallback((f) => {
    if (!f) {
      setFichier(null);
      setRapport(null);
      setEtape(ETAPES.CHOIX);
      setErreur(null);
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
      const resultat = await envoyerFichier(
        fichier,
        false,
        abortRef.current.signal
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
  }, [fichier]);

  const annuler = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const recommencer = useCallback(() => {
    setFichier(null);
    setRapport(null);
    setEtape(ETAPES.CHOIX);
    setErreur(null);
  }, []);

  return {
    fichier,
    rapport,
    etape,
    loading,
    erreur,
    ETAPES,
    choisirFichier,
    previsualiser,
    confirmer,
    annuler,
    recommencer,
  };
}