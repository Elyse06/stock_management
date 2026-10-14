import { API_ENDPOINTS } from "@/config/endpoints";
import { apiClient, publicClient, refreshAccessToken } from "@/lib/api/client";
import { clearTokens, getRefreshToken, setTokens } from "@/lib/api/tokenStore";

export async function login(email, password) {
  const { data } = await publicClient.post(API_ENDPOINTS.LOGIN, { utilisateur_mail: email, password });
  setTokens({ access: data.access, refresh: data.refresh });
  return fetchCurrentUser();
}

export async function fetchCurrentUser() {
  const { data } = await apiClient.get(API_ENDPOINTS.ME);
  return data;
}

/**
 * Restaure la session au chargement : le jeton d'accès n'étant pas persisté,
 * on en redemande un à partir du jeton de rafraîchissement.
 */
export async function restoreSession() {
  if (!getRefreshToken()) return null;
  await refreshAccessToken();
  return fetchCurrentUser();
}

/** Change son mot de passe ; les anciens jetons sont révoqués, les nouveaux sont enregistrés. */
export async function changerMotDePasse(ancien, nouveau) {
  const { data } = await apiClient.post(API_ENDPOINTS.CHANGER_MOT_DE_PASSE, { ancien, nouveau });
  setTokens({ access: data.access, refresh: data.refresh });
  return fetchCurrentUser();
}

export function logout() {
  clearTokens();
}
