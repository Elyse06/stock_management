from reportlab.lib.units import cm

from apps.common.pdf import fiche_pdf, informations, nombre, p, section, tableau

LIGNES_MAX = 1000  # au-delà, le rapport le signale (filtrer davantage)


def _texte(valeur):
    if valeur is None or valeur == "":
        return "—"
    if isinstance(valeur, int | float) or hasattr(valeur, "as_tuple"):
        return nombre(valeur)
    return str(valeur)


def generer_rapport(titre, filtres, colonnes, lignes, total, total_quantite=None):
    synthese = [("Lignes", f"{total}" + (f" (les {LIGNES_MAX} premières sont listées)" if total > LIGNES_MAX else ""))]
    if total_quantite is not None:
        synthese.append(("Quantité totale", nombre(total_quantite)))
    largeur_totale = sum(largeur for _, _, largeur in colonnes)
    echelle = 17.4 / largeur_totale  # le tableau occupe toute la largeur utile de la page
    blocs = [
        section("Filtres"),
        informations(filtres),
        section("Synthèse"),
        informations(synthese),
        section("Détail"),
        tableau([libelle for _, libelle, _ in colonnes],
                [[_texte(ligne.get(cle)) for cle, _, _ in colonnes] for ligne in lignes],
                [largeur * echelle * cm for _, _, largeur in colonnes]) if lignes else p("Aucune donnée pour ces filtres."),
    ]
    return fiche_pdf(titre, "Rapport du tableau de bord", f"{total} ligne(s)", blocs)
