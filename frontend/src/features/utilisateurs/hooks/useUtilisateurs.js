import { useQuery } from "@tanstack/react-query";

import { fetchAllPages } from "@/lib/api/pagination";

import { utilisateursApi } from "../api/utilisateursApi";

const normaliser = (user) => ({
  ...user,
  actions: user.actions_liste || [],
  emp_id: user.emp_id_lie || "",
  role_id: user.role_id || "CUSTOM",
  role_nom: user.role_nom || "Profil Personnalisé",
});

/** Tous les comptes (toutes les pages : auparavant seule la première, 20 comptes, était chargée). */
export function useUtilisateurs(options) {
  return useQuery({
    queryKey: ["utilisateurs"],
    queryFn: ({ signal }) => fetchAllPages(utilisateursApi.endpoint, {}, { signal }).then((rows) => rows.map(normaliser)),
    ...options,
  });
}
