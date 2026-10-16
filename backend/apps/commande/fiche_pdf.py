from reportlab.lib.units import cm

from apps.common.pdf import PETIT, date_fr, fiche_pdf, informations, nombre, p, section, signatures, tableau
from apps.stock.models import DetailMouvement, Mouvement, UniteArticle


def _sortie(commande):
    return (Mouvement.objects.select_related("magasin_source")
            .filter(type_mouvement=Mouvement.Type.SORTIE, origine__startswith=f"Commande #{commande.pk} -").first())


def generer_fiche_commande(commande):
    demandeur, sortie = commande.employe_demandeur, _sortie(commande)
    remis, series = {}, {}
    if sortie:
        for detail in DetailMouvement.objects.filter(mouvement=sortie):
            remis[detail.article_id] = remis.get(detail.article_id, 0) + detail.quantite
        for unite in UniteArticle.objects.filter(mouvement_sortie__mouvement=sortie).order_by("numero_de_serie"):
            series.setdefault(unite.article_id, []).append(unite.numero_de_serie or f"#{unite.unite_id}")

    lignes = []
    for detail in commande.details.select_related("article").prefetch_related(
        "attributions__affectation__employe", "attributions__affectation__direction",
        "attributions__affectation__salle", "attributions__affectation__site",
    ):
        beneficiaires = "\n".join(
            f"{a.affectation.nom} : {nombre(a.quantite_demandee or a.quantite)} demandée(s)"
            + (f", {nombre(a.quantite_validee)} validée(s)" if a.quantite_validee else "")
            + (f" — refusée ({a.motif_refus})" if a.statut == "REFUSEE" and a.motif_refus else " — refusée" if a.statut == "REFUSEE" else "")
            for a in detail.attributions.all()
        ) or "—"
        lignes.append([
            [p(detail.article.designation), p(detail.article.code_article, PETIT)],
            nombre(detail.quantite), nombre(remis.get(detail.article_id, 0)) if sortie else "—",
            beneficiaires, ", ".join(series.get(detail.article_id, [])) or "—",
        ])

    traite = commande.statut not in ("EN_ATTENTE",)
    blocs = [
        section("Demande"),
        informations([("Date de la demande", date_fr(commande.date_commande)), ("Statut", commande.get_statut_display()),
                      ("Objet", commande.objet or "—")]),
        section("Demandeur"),
        informations([
            ("Nom", getattr(demandeur, "emp_nom", None)), ("Matricule", getattr(demandeur, "emp_matricule", None)),
            ("Fonction", getattr(demandeur, "emp_fonction", None)),
            ("Direction", getattr(getattr(demandeur, "emp_dir_id", None), "dir_libelle", None)),
            ("Site", getattr(getattr(demandeur, "emp_site_id", None), "site_nom", None)),
        ]),
        section("Articles demandés"),
        tableau(["Article", "Demandée", "Remise", "Bénéficiaires"], lignes,
                [4 * cm, 2.5 * cm, 2 * cm, 5.1 * cm]),
        section("Traitement"),
        informations([
            ("Traitée par", commande.employe_traitant.emp_nom if traite and commande.employe_traitant else "Non traitée"),
            ("Le", date_fr(commande.date_traitement) if traite else "—"),
            ("Magasin de sortie", sortie.magasin_source.magasin_nom if sortie and sortie.magasin_source else "—"),
            ("Commentaire", commande.commentaire_agent or "—"),
        ]),
        signatures([("Le demandeur", getattr(demandeur, "emp_nom", "")),
                    ("Le gestionnaire du stock", commande.employe_traitant.emp_nom if traite and commande.employe_traitant else "")]),
    ]
    return fiche_pdf("Fiche de demande de matériel", f"Commande n°{commande.pk}", commande.get_statut_display(), blocs)
