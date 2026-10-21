import { useCallback, useState } from "react";

import { API_ENDPOINTS } from "@/config/endpoints";
import { useFileImport } from "@/hooks/useFileImport";

const EXTENSIONS = [".xlsx", ".xls"];

/**
 * Une correspondance d'affectation est identifiée par « TYPE::libellé ».
 * Plusieurs lignes qui pointent vers la même correspondance partagent la même
 * clé, et donc la même confirmation.
 */
export const cleSuggestion = (suggestion) => `${suggestion.type}::${suggestion.libelle}`;

const lignesAConfirmer = (rapport) => (rapport?.details || []).filter((l) => l.statut === "A_TRAITER" && l.suggestion);

export function useImportImmobilisations() {
  const [clesConfirmees, setClesConfirmees] = useState(new Set());

  // À la confirmation, les clés cochées sont dépliées en numéros de lignes.
  const buildFields = useCallback(
    (dryRun, rapport) => {
      if (dryRun) return {};
      const lignes = lignesAConfirmer(rapport)
        .filter((l) => clesConfirmees.has(cleSuggestion(l.suggestion)))
        .map((l) => l.ligne);
      return lignes.length ? { lignes_confirmees: JSON.stringify(lignes) } : {};
    },
    [clesConfirmees],
  );

  // Toute correspondance trouvée est pré-cochée : seules les lignes sans correspondance restent « à traiter ».
  const onPreview = useCallback((rapport) => {
    setClesConfirmees(new Set(lignesAConfirmer(rapport).map((l) => cleSuggestion(l.suggestion))));
  }, []);

  const importation = useFileImport({ endpoint: API_ENDPOINTS.IMPORT_IMMOBILISATIONS, extensions: EXTENSIONS, buildFields, onPreview });

  const basculerConfirmationCle = useCallback((cle, confirmee) => {
    setClesConfirmees((precedent) => {
      const suivant = new Set(precedent);
      if (confirmee) suivant.add(cle);
      else suivant.delete(cle);
      return suivant;
    });
  }, []);

  const reinitialiser = (fn) => (...args) => {
    setClesConfirmees(new Set());
    return fn(...args);
  };

  return {
    ...importation,
    choisirFichier: reinitialiser(importation.choisirFichier),
    recommencer: reinitialiser(importation.recommencer),
    clesConfirmees,
    basculerConfirmationCle,
    // Confirmable dès qu'il y a quelque chose à importer : des lignes OK ou une correspondance confirmée.
    peutConfirmer: (importation.rapport?.lignes_ok ?? 0) > 0 || clesConfirmees.size > 0,
  };
}
