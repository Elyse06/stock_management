/**
 * Conversion des erreurs HTTP en message lisible.
 *
 * Formats renvoyés par le backend :
 *   {"detail": "..."}                      erreurs générales, 403, 404, 409, 429
 *   {"error": "..."}                       historique, IA
 *   {"champ": ["msg", ...], ...}           erreurs de validation DRF
 *   {"non_field_errors": ["..."]}          validation globale
 *   ["msg", ...]                           liste simple
 */
import { libelleChamp } from "@/constants/fieldLabels";
import { MESSAGES } from "@/constants/messages";

const STATUS_MESSAGES = {
  401: MESSAGES.UNAUTHORIZED,
  403: MESSAGES.FORBIDDEN,
  404: MESSAGES.NOT_FOUND,
  413: "Fichier trop volumineux.",
  502: "Le service distant est momentanément indisponible.",
  503: "Service momentanément indisponible.",
};

function flatten(value) {
  if (value == null) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (typeof value === "object") return Object.values(value).flatMap(flatten);
  return [String(value)];
}

function fromPayload(data, fieldLabels) {
  if (!data) return null;
  if (typeof data === "string") return data.startsWith("<") ? null : data; // page HTML d'erreur
  if (Array.isArray(data)) return flatten(data).join(" ");
  if (data.detail) return flatten(data.detail).join(" ");
  if (data.error) return flatten(data.error).join(" ");
  if (data.non_field_errors) return flatten(data.non_field_errors).join(" ");

  const messages = Object.entries(data).map(([champ, valeur]) => {
    const texte = flatten(valeur).join(" ");
    // Erreurs imbriquées (ex. details[0].quantite) : le texte seul suffit.
    if (/^\d+$/.test(champ) || !texte) return texte;
    return `${fieldLabels?.[champ] ?? libelleChamp(champ)} : ${texte}`;
  });
  return messages.filter(Boolean).join(" | ") || null;
}

export function getErrorMessage(error, fallback = MESSAGES.GENERIC, fieldLabels) {
  if (!error) return fallback;
  if (error.code === "ECONNABORTED") return MESSAGES.TIMEOUT;
  if (!error.response) return error.request ? MESSAGES.NETWORK_ERROR : error.message || fallback;

  const { status, data, headers } = error.response;
  if (status === 429) {
    const attente = Number(headers?.["retry-after"]);
    return attente
      ? `Trop de tentatives. Réessayez dans ${Math.ceil(attente)} seconde(s).`
      : "Trop de tentatives. Réessayez dans quelques instants.";
  }
  if (status >= 500 && status !== 502 && status !== 503) return MESSAGES.SERVER_ERROR;
  return fromPayload(data, fieldLabels) || STATUS_MESSAGES[status] || fallback;
}

/** Erreurs par champ d'un formulaire (``{champ: "message"}``), pour affichage sous les champs. */
export function getFieldErrors(error) {
  const data = error?.response?.status === 400 ? error.response.data : null;
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  return Object.fromEntries(
    Object.entries(data)
      .filter(([champ]) => !["detail", "non_field_errors", "error"].includes(champ))
      .map(([champ, valeur]) => [champ, flatten(valeur).join(" ")]),
  );
}

export const isClientError = (error) => {
  const status = error?.response?.status;
  return status >= 400 && status < 500;
};
