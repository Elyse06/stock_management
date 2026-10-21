import { PASSWORD_MIN_LENGTH } from "@/constants/permissions";

export const AIDE_MOT_DE_PASSE = `Au moins ${PASSWORD_MIN_LENGTH} caractères, pas uniquement des chiffres, pas un mot de passe courant.`;

/** Vérifications locales d'un nouveau mot de passe (le serveur refuse en plus les mots de passe courants). */
export function verifierNouveauMotDePasse({ nouveau, confirmation }) {
  const erreurs = {};
  if (nouveau.length < PASSWORD_MIN_LENGTH) erreurs.nouveau = `Au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  else if (/^\d+$/.test(nouveau)) erreurs.nouveau = "Le mot de passe ne peut pas contenir uniquement des chiffres.";
  if (confirmation !== nouveau) erreurs.confirmation = "Les deux mots de passe ne correspondent pas.";
  return erreurs;
}
