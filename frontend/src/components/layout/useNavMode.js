import { useLayoutEffect, useRef, useState } from "react";

export const NAV_DRAWER_ID = "navigation-laterale";

export function useNavMode({ forceTiroir = false, deps = [] }) {
  const conteneurRef = useRef(null);
  const mesureCompletRef = useRef(null);
  const mesureSerreRef = useRef(null);
  const mesureIconesRef = useRef(null);
  const [largeurs, setLargeurs] = useState({ dispo: Number.POSITIVE_INFINITY, complet: 0, serre: 0, icones: 0 });

  useLayoutEffect(() => {
    const conteneur = conteneurRef.current;
    const complet = mesureCompletRef.current;
    const serre = mesureSerreRef.current;
    const icones = mesureIconesRef.current;
    if (!conteneur || !complet || !serre || !icones) return undefined;

    const mesurer = () =>
      setLargeurs((avant) => {
        const suivant = {
          dispo: conteneur.clientWidth,
          complet: complet.scrollWidth,
          serre: serre.scrollWidth,
          icones: icones.scrollWidth,
        };
        const identique = Object.keys(suivant).every((cle) => suivant[cle] === avant[cle]);
        return identique ? avant : suivant;
      });

    mesurer();
    const observateur = new ResizeObserver(mesurer);
    [conteneur, complet, serre, icones].forEach((element) => observateur.observe(element));
    document.fonts?.ready.then(mesurer).catch(() => {});
    return () => observateur.disconnect();
  }, deps);

  let mode = "complet";
  if (forceTiroir || largeurs.dispo < largeurs.icones) mode = "tiroir";
  else if (largeurs.dispo < largeurs.serre) mode = "icones";
  else if (largeurs.dispo < largeurs.complet) mode = "serre";

  return { mode, conteneurRef, mesureCompletRef, mesureSerreRef, mesureIconesRef };
}
