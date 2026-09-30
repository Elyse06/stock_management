import { useState, useCallback, useRef } from "react";
import { apiClient } from "../../../api/client";

const TAILLE_MAX = 10 * 1024 * 1024; // 10 Mo
const ETAPES = { CHOIX: "choix", APERCU: "apercu", CONFIRME: "confirme" };

async function envoyerFichier(fichier, dryRun, signal, resolutionsDirection) {
  const formData = new FormData();
  formData.append("fichier", fichier);
  formData.append("dry_run", dryRun ? "true" : "false");
  if (resolutionsDirection && Object.keys(resolutionsDirection).length > 0) {
    formData.append("resolutions_direction", JSON.stringify(resolutionsDirection));
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
  const [resolutionsDirection, setResolutionsDirection] = useState({});
  const abortRef = useRef(null);

  const choisirFichier = useCallback((f) => {
    if (!f) {
      setFichier(null);
      setRapport(null);
      setEtape(ETAPES.CHOIX);
      setErreur(null);
      setResolutionsDirection({});
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
    setResolutionsDirection({});
  }, []);

  const definirResolutionDirection = useCallback((ligne, directionId) => {
    setResolutionsDirection((precedent) => ({
      ...precedent,
      [ligne]: directionId || "",
    }));
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
      // Seules les lignes où l'utilisateur a explicitement choisi une
      // direction existante sont envoyées. Une ligne absente (ou vide)
      // entraîne la création automatique d'une nouvelle direction côté serveur.
      const resolutionsAEnvoyer = Object.fromEntries(
        Object.entries(resolutionsDirection).filter(([, valeur]) => valeur)
      );
      const resultat = await envoyerFichier(
        fichier,
        false,
        abortRef.current.signal,
        resolutionsAEnvoyer
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
  }, [fichier, resolutionsDirection]);

  const annuler = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const recommencer = useCallback(() => {
    setFichier(null);
    setRapport(null);
    setEtape(ETAPES.CHOIX);
    setErreur(null);
    setResolutionsDirection({});
  }, []);

  return {
    fichier,
    rapport,
    etape,
    loading,
    erreur,
    ETAPES,
    resolutionsDirection,
    definirResolutionDirection,
    choisirFichier,
    previsualiser,
    confirmer,
    annuler,
    recommencer,
  };
}