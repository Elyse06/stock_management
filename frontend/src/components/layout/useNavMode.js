import { useLayoutEffect, useRef, useState } from "react";

/** Identifiant du panneau latéral (relie le bouton menu au panneau, pour l'accessibilité). */
export const NAV_DRAWER_ID = "navigation-laterale";

/**
 * Mode d'affichage de la navigation selon la place RÉELLEMENT disponible :
 *  - "complet" : icône + libellé ;
 *  - "serre"   : icône + libellé, espacement réduit (écrans de portable, 1280 px) ;
 *  - "icones"  : icône seule (libellé en infobulle) ;
 *  - "tiroir"  : bouton menu ouvrant un panneau latéral.
 *
 * On mesure plutôt que de fixer des seuils : la longueur du menu dépend des
 * droits (7 rubriques pour un administrateur, 3 pour un demandeur) et des
 * libellés. Des rangées invisibles donnent la largeur nécessaire à chaque mode.
 *
 * Pas d'oscillation à la frontière : en mode tiroir, le bouton menu réduit la
 * place disponible, ce qui retarde naturellement le retour aux icônes.
 */
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
    // Les libellés changent de largeur une fois la police chargée.
    document.fonts?.ready.then(mesurer).catch(() => {});
    return () => observateur.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  let mode = "complet";
  if (forceTiroir || largeurs.dispo < largeurs.icones) mode = "tiroir";
  else if (largeurs.dispo < largeurs.serre) mode = "icones";
  else if (largeurs.dispo < largeurs.complet) mode = "serre";

  return { mode, conteneurRef, mesureCompletRef, mesureSerreRef, mesureIconesRef };
}
