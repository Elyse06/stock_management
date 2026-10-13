/** Calculs et textes du tableau de bord (fonctions pures). */

const nombre = new Intl.NumberFormat("fr-FR");
export const formatNombre = (valeur) => nombre.format(Number(valeur) || 0);

/** « 2026-10 » -> « oct. » (et « oct. 26 » en janvier ou si ``avecAnnee``). */
export function moisCourt(libelle, avecAnnee = false) {
  const [annee, mois] = String(libelle).split("-").map(Number);
  if (!annee || !mois) return libelle;
  const date = new Date(annee, mois - 1, 1);
  const court = date.toLocaleDateString("fr-FR", { month: "short" });
  return avecAnnee || mois === 1 ? `${court} ${String(annee).slice(2)}` : court;
}

/** Évolution en % entre deux valeurs ; ``null`` si la base est nulle (pas de comparaison possible). */
export function variation(actuel, precedent) {
  const a = Number(actuel) || 0;
  const p = Number(precedent) || 0;
  if (p === 0) return null;
  return Math.round(((a - p) / p) * 100);
}

export const pourcentage = (part, total) => (total ? Math.round((part / total) * 100) : 0);

/** « 23 % », ou « < 1 % » pour une part petite mais non nulle (au lieu d'un « 0 % » trompeur). */
export function libellePourcentage(part, total) {
  const valeur = pourcentage(part, total);
  return valeur === 0 && part > 0 ? "< 1 %" : `${valeur} %`;
}

/** Prénom pour la salutation : « RAKOTO Jean Marc » -> « Jean Marc » (le nom de famille est en majuscules). */
export function prenom(nomComplet) {
  const mots = String(nomComplet || "").trim().split(/\s+/).filter(Boolean);
  const prenoms = mots.filter((mot) => mot !== mot.toUpperCase());
  return (prenoms.length ? prenoms : mots).join(" ");
}

export function salutation(heure = new Date().getHours()) {
  return heure < 18 ? "Bonjour" : "Bonsoir";
}

export function dateDuJour() {
  const texte = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/**
 * Points clés calculés à partir des données (et non par l'IA) : toujours exacts
 * et disponibles. Au plus 4, les alertes d'abord.
 */
export function pointsCles({ kpis, repartitionMagasin = [], topConsommes = [], produitsDormants = [] }) {
  if (!kpis) return [];
  const points = [];
  if (kpis.produits_en_rupture > 0) {
    points.push({ niveau: "critique", texte: `${formatNombre(kpis.produits_en_rupture)} article(s) en rupture de stock.` });
  }
  if (kpis.produits_sous_seuil > 0) {
    points.push({ niveau: "attention", texte: `${formatNombre(kpis.produits_sous_seuil)} article(s) sous leur seuil d'alerte.` });
  }
  const evolution = variation(kpis.sorties_du_mois, kpis.sorties_mois_precedent);
  if (evolution !== null && evolution !== 0) {
    points.push({
      niveau: "info",
      texte: `Sorties du mois en ${evolution > 0 ? "hausse" : "baisse"} de ${Math.abs(evolution)} % par rapport au mois dernier.`,
    });
  }
  const totalMagasins = repartitionMagasin.reduce((somme, m) => somme + m.stock, 0);
  const principal = [...repartitionMagasin].sort((x, y) => y.stock - x.stock)[0];
  if (principal && repartitionMagasin.length > 1 && pourcentage(principal.stock, totalMagasins) >= 50) {
    points.push({ niveau: "info", texte: `${principal.magasin} concentre ${pourcentage(principal.stock, totalMagasins)} % du stock.` });
  }
  if (topConsommes[0]) {
    points.push({
      niveau: "info",
      texte: `Article le plus demandé sur 20 jours : ${topConsommes[0].designation} (${formatNombre(topConsommes[0].quantite_consomme)}).`,
    });
  }
  if (produitsDormants.length > 0) {
    const nombreDormants = produitsDormants.length >= 50 ? "Au moins 50" : formatNombre(produitsDormants.length);
    points.push({ niveau: "info", texte: `${nombreDormants} article(s) sans mouvement depuis plus de 3 mois.` });
  }
  if (points.length === 0) points.push({ niveau: "ok", texte: "Aucun point d'attention : le stock est sous contrôle." });
  return points.slice(0, 4);
}

/** Jours écoulés depuis une date ISO (``null`` si jamais). */
export function joursDepuis(dateIso) {
  if (!dateIso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(dateIso).getTime()) / 86400000));
}
