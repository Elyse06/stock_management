/** Règles métier du formulaire de mouvement (entrée / transfert). */

export const EMPTY_DETAIL = { article: "", quantite: 1, numeros_de_serie: [], fournisseur: "", prix_achat: "" };

/** Ajoute des numéros de série sans doublon (insensible à la casse) ; la quantité suit. */
export function ajouterNumeros(detail, nouveaux) {
  const vus = new Set(detail.numeros_de_serie.map((n) => n.toLowerCase()));
  const ajoutes = [];
  for (const brut of nouveaux) {
    const numero = brut.trim();
    if (numero && !vus.has(numero.toLowerCase())) {
      vus.add(numero.toLowerCase());
      ajoutes.push(numero);
    }
  }
  const numeros = [...detail.numeros_de_serie, ...ajoutes];
  return { ...detail, numeros_de_serie: numeros, quantite: numeros.length };
}

export function retirerNumero(detail, index) {
  const numeros = detail.numeros_de_serie.filter((_, k) => k !== index);
  return { ...detail, numeros_de_serie: numeros, quantite: numeros.length };
}

/** Message d'erreur, ou ``null`` si le mouvement est valide. */
export function validerMouvement({ type, magasinSource, magasinDestination, details }, getArticle) {
  if (details.some((d) => !String(d.article).trim())) return "Veuillez sélectionner un article valide pour chaque ligne.";

  for (const detail of details) {
    const article = getArticle(detail.article);
    const nom = article?.designation;
    if (article?.mode_suivi === "NUMERO_SERIE") {
      const numeros = detail.numeros_de_serie.filter((ns) => ns.trim());
      if (numeros.length === 0) return `Veuillez saisir au moins un numéro de série pour « ${nom} ».`;
      if (new Set(numeros.map((ns) => ns.trim().toLowerCase())).size !== numeros.length) {
        return `Numéros de série en doublon pour « ${nom} ».`;
      }
    } else if (!Number.isInteger(Number(detail.quantite)) || Number(detail.quantite) <= 0) {
      return `Quantité invalide pour « ${nom} ».`;
    }
    if (detail.prix_achat !== "" && !(Number(detail.prix_achat) >= 0)) return `Prix d'achat invalide pour « ${nom} ».`;
  }

  if (!magasinDestination) return `Le magasin destination est requis pour ${type === "ENTREE" ? "une entrée" : "un transfert"}.`;
  if (type === "TRANSFERT") {
    if (!magasinSource) return "Le magasin source est requis pour un transfert.";
    if (magasinSource === magasinDestination) return "Le magasin source et destination doivent être différents.";
  }
  return null;
}

export function construirePayload({ type, origine, magasinSource, magasinDestination, details }, getArticle) {
  const payload = {
    type_mouvement: type,
    magasin_destination: Number(magasinDestination),
    details: details.map((d) => {
      const serie = getArticle(d.article)?.mode_suivi === "NUMERO_SERIE";
      const numeros = d.numeros_de_serie.map((ns) => ns.trim()).filter(Boolean);
      const ligne = { article: String(d.article), quantite: serie ? numeros.length : parseInt(d.quantite, 10) };
      if (serie) ligne.numeros_de_serie = numeros;
      if (type === "ENTREE" && d.fournisseur) {
        ligne.fournisseur = Number(d.fournisseur);
        // Champ décimal facultatif : null plutôt qu'une chaîne vide.
        ligne.prix_achat = d.prix_achat === "" ? null : d.prix_achat;
      }
      return ligne;
    }),
  };
  if (type === "TRANSFERT") payload.magasin_source = Number(magasinSource);
  if (type === "ENTREE" && origine.trim()) payload.origine = origine.trim();
  return payload;
}
