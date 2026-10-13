import { useDirections, useMagasins, useSalles, useSites } from "@/hooks/useReferenceData";

/** Types de localisation : liste, libellés et paramètre attendu par le backend. */
export function useLocalisations(type) {
  const listes = {
    magasin: useMagasins({ enabled: type === "magasin" }),
    direction: useDirections({ enabled: type === "direction" }),
    site: useSites({ enabled: type === "site" }),
    salle: useSalles({ enabled: type === "salle" }),
  };
  const config = {
    magasin: {
      label: "Magasin", placeholder: "Sélectionner un magasin...", param: "magasin_id", description: "stockés au",
      id: (m) => m.magasin_id, nom: (m) => m.magasin_nom, libelle: (m) => `${m.magasin_nom}${m.localite_nom ? ` (${m.localite_nom})` : ""}`,
    },
    direction: {
      label: "Direction", placeholder: "Sélectionner une direction...", param: "direction_id", description: "attribués à la",
      id: (d) => d.dir_id, nom: (d) => d.dir_libelle, libelle: (d) => d.dir_libelle,
    },
    site: {
      label: "Site", placeholder: "Sélectionner un site...", param: "site_id", description: "attribués au",
      id: (s) => s.site_id, nom: (s) => s.site_nom, libelle: (s) => `${s.site_nom}${s.localite ? ` (${s.localite})` : ""}`,
    },
    salle: {
      label: "Salle", placeholder: "Sélectionner une salle...", param: "salle_id", description: "attribués à la salle",
      id: (s) => s.salle_id, nom: (s) => s.nom, libelle: (s) => `${s.nom}${s.localite_nom ? ` (${s.localite_nom})` : ""}`,
    },
  }[type];
  return { ...config, items: listes[type].data ?? [] };
}

export const TYPES_LOCALISATION = [
  { value: "magasin", label: "Magasin" },
  { value: "direction", label: "Direction" },
  { value: "site", label: "Site" },
  { value: "salle", label: "Salle" },
];
