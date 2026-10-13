/** Périodes prédéfinies (semaine, mois...) en heure LOCALE. */

const finDeJour = (date) => {
  date.setHours(23, 59, 59, 999);
  return date;
};

/** Bornes ``{debut, fin}`` (fin incluse) d'une période, ou ``null`` pour « toutes ». */
export function bornesPeriode(periode, reference = new Date()) {
  const jour = new Date(reference);
  jour.setHours(0, 0, 0, 0);
  switch (periode) {
    case "aujourdhui":
      return { debut: jour, fin: finDeJour(new Date(jour)) };
    case "semaine": {
      const debut = new Date(jour);
      const j = debut.getDay();
      debut.setDate(debut.getDate() - (j === 0 ? 6 : j - 1));
      const fin = new Date(debut);
      fin.setDate(fin.getDate() + 6);
      return { debut, fin: finDeJour(fin) };
    }
    case "mois":
      return { debut: new Date(jour.getFullYear(), jour.getMonth(), 1), fin: finDeJour(new Date(jour.getFullYear(), jour.getMonth() + 1, 0)) };
    case "annee":
      return { debut: new Date(jour.getFullYear(), 0, 1), fin: finDeJour(new Date(jour.getFullYear(), 11, 31)) };
    default:
      return null;
  }
}

/**
 * Date ``AAAA-MM-JJ`` en heure locale.
 * (``toISOString()`` convertit en UTC : à Madagascar, minuit local devient la veille.)
 */
export function toISODate(date) {
  if (!date) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const aujourdhuiISO = () => toISODate(new Date());
