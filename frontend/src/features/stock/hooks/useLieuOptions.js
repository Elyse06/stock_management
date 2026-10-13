import { useMemo } from "react";

import { toOptions, useDirections, useMagasins, useSalles, useSites } from "@/hooks/useReferenceData";

/** Options du filtre « Lieu » selon le type choisi (chargées seulement si nécessaire). */
export function useLieuOptions(type) {
  const { data: magasins = [] } = useMagasins({ enabled: type === "magasin" });
  const { data: directions = [] } = useDirections({ enabled: type === "direction" });
  const { data: sites = [] } = useSites({ enabled: type === "site" });
  const { data: salles = [] } = useSalles({ enabled: type === "salle" });

  return useMemo(() => {
    switch (type) {
      case "magasin":
        return toOptions(magasins, (m) => m.magasin_id, (m) => (m.localite_nom ? `${m.magasin_nom} (${m.localite_nom})` : m.magasin_nom), "Tous");
      case "direction":
        return toOptions(directions, (d) => d.dir_id, (d) => d.dir_libelle, "Tous");
      case "site":
        return toOptions(sites, (s) => s.site_id, (s) => s.site_nom, "Tous");
      case "salle":
        return toOptions(salles, (s) => s.salle_id, (s) => s.nom, "Tous");
      default:
        return [{ value: "", label: "Tous" }];
    }
  }, [type, magasins, directions, sites, salles]);
}
