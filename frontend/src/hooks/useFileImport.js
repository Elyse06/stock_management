import { useCallback, useRef, useState } from "react";

import { UPLOAD_TIMEOUT } from "@/config/env";
import { apiClient } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/errors";

export const ETAPES = Object.freeze({ CHOIX: "choix", APERCU: "apercu", CONFIRME: "confirme" });
const TAILLE_MAX = 10 * 1024 * 1024; // identique à la limite du backend

const estAnnulation = (e) => e?.name === "CanceledError" || e?.code === "ERR_CANCELED";

/**
 * Import de fichier en deux temps : aperçu (``dry_run``) puis confirmation.
 *
 * @param endpoint     URL d'import
 * @param extensions   extensions acceptées, ex. [".xlsx", ".xls"]
 * @param buildFields  ``(dryRun, rapport) => ({champ: valeur})`` champs additionnels du formulaire
 * @param onPreview    appelé avec le rapport d'aperçu (ex. pré-cocher des correspondances)
 */
export function useFileImport({ endpoint, extensions, buildFields = () => ({}), onPreview }) {
  const [fichier, setFichier] = useState(null);
  const [rapport, setRapport] = useState(null);
  const [etape, setEtape] = useState(ETAPES.CHOIX);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);
  const abortRef = useRef(null);

  const reinitialiser = useCallback(() => {
    setFichier(null);
    setRapport(null);
    setEtape(ETAPES.CHOIX);
    setErreur(null);
  }, []);

  const choisirFichier = useCallback(
    (f) => {
      if (!f) return reinitialiser();
      const extension = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
      if (!extensions.includes(extension)) {
        return setErreur(`Format non supporté. Formats acceptés : ${extensions.join(", ")}.`);
      }
      if (f.size > TAILLE_MAX) return setErreur("Fichier trop volumineux (max 10 Mo).");
      if (f.size === 0) return setErreur("Le fichier est vide.");
      setFichier(f);
      setRapport(null);
      setEtape(ETAPES.CHOIX);
      setErreur(null);
    },
    [extensions, reinitialiser],
  );

  const envoyer = useCallback(
    async (dryRun, messageErreur) => {
      if (!fichier) return null;
      setLoading(true);
      setErreur(null);
      abortRef.current = new AbortController();
      const formData = new FormData();
      formData.append("fichier", fichier);
      formData.append("dry_run", dryRun ? "true" : "false");
      Object.entries(buildFields(dryRun, rapport)).forEach(([cle, valeur]) => {
        if (valeur !== undefined && valeur !== null) formData.append(cle, valeur);
      });
      try {
        const { data } = await apiClient.post(endpoint, formData, {
          signal: abortRef.current.signal,
          timeout: UPLOAD_TIMEOUT,
        });
        setRapport(data);
        setEtape(dryRun ? ETAPES.APERCU : ETAPES.CONFIRME);
        if (dryRun) onPreview?.(data);
        return data;
      } catch (e) {
        if (!estAnnulation(e)) setErreur(getErrorMessage(e, messageErreur));
        return null;
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [fichier, rapport, endpoint, buildFields, onPreview],
  );

  const previsualiser = useCallback(() => envoyer(true, "Impossible d'analyser le fichier."), [envoyer]);
  const confirmer = useCallback(async () => Boolean(await envoyer(false, "Impossible de confirmer l'import.")), [envoyer]);
  const annuler = useCallback(() => abortRef.current?.abort(), []);

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
    recommencer: reinitialiser,
  };
}
