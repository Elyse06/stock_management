import { PASSWORD_MIN_LENGTH } from "@/constants/permissions";

const CARACTERES = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Mot de passe aléatoire (générateur cryptographique du navigateur). */
export function genererMotDePasse(longueur = 14) {
  const valeurs = new Uint32Array(longueur);
  crypto.getRandomValues(valeurs);
  return Array.from(valeurs, (v) => CARACTERES[v % CARACTERES.length]).join("");
}

/**
 * Pré-validation reprenant les règles du backend (longueur minimale, pas
 * uniquement des chiffres). Le backend refuse aussi les mots de passe courants.
 */
export function verifierMotDePasse(motDePasse) {
  if (motDePasse.length < PASSWORD_MIN_LENGTH) return `Au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  if (/^\d+$/.test(motDePasse)) return "Le mot de passe ne peut pas contenir uniquement des chiffres.";
  return null;
}
