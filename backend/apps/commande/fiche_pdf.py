"""Accusé de réception d'une commande validée : matériel remis, signé par le demandeur, le chef
hiérarchique qui a pré-validé et le gestionnaire du stock qui a traité la commande."""
from reportlab.lib.units import cm

from apps.commande.models import AttributionDetailCommande
from apps.common.pdf import PETIT, date_fr, fiche_pdf, informations, nombre, p, section, signatures, tableau
from apps.stock.models import DetailMouvement, Mouvement, UniteArticle


def _sortie(commande):
    """Mouvement de sortie généré à la validation (son origine porte le numéro de la commande)."""
    return (Mouvement.objects.select_related("magasin_source")
            .filter(type_mouvement=Mouvement.Type.SORTIE, origine__startswith=f"Commande #{commande.pk} -").first())


def generer_accuse_reception(commande):
    demandeur, sortie = commande.employe_demandeur, _sortie(commande)
    lignes = []
    if sortie:
        details = DetailMouvement.objects.filter(mouvement=sortie).select_related(
            "article", "affectation__employe", "affectation__direction", "affectation__salle", "affectation__site",
        ).order_by("pk")
        for detail in details:
            unites = UniteArticle.objects.filter(mouvement_sortie=detail).order_by("numero_de_serie")
            series = ", ".join(u.numero_de_serie or f"#{u.unite_id}" for u in unites) or "—"
            lignes.append([
                [p(detail.article.designation), p(detail.article.code_article, PETIT)],
                nombre(detail.quantite), detail.affectation.nom if detail.affectation_id else "—", series,
            ])
    refusees = [
        f"{a.detail_commande.libelle} pour {a.affectation.nom}" + (f" ({a.motif_refus})" if a.motif_refus else "")
        for a in AttributionDetailCommande.objects.filter(detail_commande__commande=commande, statut="REFUSEE")
        .select_related("detail_commande__article", "affectation__employe", "affectation__direction",
                        "affectation__salle", "affectation__site")
    ]
    chef, gestionnaire = commande.employe_prevalidateur, commande.employe_traitant
    blocs = [
        section("Commande"),
        informations([("Date de la demande", date_fr(commande.date_commande)), ("Validée le", date_fr(commande.date_traitement)),
                      ("Objet", commande.objet or "—"),
                      ("Magasin de sortie", sortie.magasin_source.magasin_nom if sortie and sortie.magasin_source else "—")]),
        section("Demandeur"),
        informations([
            ("Nom", getattr(demandeur, "emp_nom", None)), ("Matricule", getattr(demandeur, "emp_matricule", None)),
            ("Fonction", getattr(demandeur, "emp_fonction", None)),
            ("Direction", getattr(getattr(demandeur, "emp_dir_id", None), "dir_libelle", None)),
        ]),
        section("Matériel remis"),
        tableau(["Article", "Quantité", "Bénéficiaire", "N° de série"], lignes or [["Aucun matériel remis", "", "", ""]],
                [5.6 * cm, 2 * cm, 4.6 * cm, 5.2 * cm]),
    ]
    if refusees:
        blocs += [section("Non accordé"), p("\n".join(refusees))]
    if commande.commentaire_agent:
        blocs += [section("Commentaire du gestionnaire"), p(commande.commentaire_agent)]
    blocs += [
        section("Accusé de réception"),
        p("Le demandeur reconnaît avoir reçu le matériel ci-dessus, en bon état, pour les bénéficiaires indiqués."),
        signatures([("Le demandeur", getattr(demandeur, "emp_nom", "")),
                    ("Le chef hiérarchique", getattr(chef, "emp_nom", "")),
                    ("Le gestionnaire du stock", getattr(gestionnaire, "emp_nom", ""))]),
    ]
    return fiche_pdf("Accusé de réception de matériel", f"Commande n°{commande.pk}", "Validée", blocs)
