from reportlab.lib.units import cm

from apps.commande.models import AttributionDetailCommande
from apps.common.pdf import PETIT, date_fr, fiche_pdf, informations, nombre, p, section, signatures, tableau

_SANS_LIGNE = [["Aucun article accordé", "", ""]]


def _employe(employe, date_libelle=None, date=None):
    """Identité d'un employé (et, pour le pré-validateur et le traiteur, la date de son intervention)."""
    paires = [
        ("Nom", getattr(employe, "emp_nom", None) or "—"),
        ("Matricule", getattr(employe, "emp_matricule", None) or "—"),
        ("Fonction", getattr(employe, "emp_fonction", None) or "—"),
        ("Direction", getattr(getattr(employe, "emp_dir_id", None), "dir_libelle", None) or "—"),
    ]
    if date_libelle:
        paires.append((date_libelle, date_fr(date) if date else "—"))
    return informations(paires)


def _articles_accordes(commande):
    """Une ligne par attribution validée : article, quantité accordée, bénéficiaire."""
    attributions = (
        AttributionDetailCommande.objects.filter(detail_commande__commande=commande, statut="VALIDEE")
        .select_related("detail_commande__article", "affectation__employe", "affectation__direction",
                        "affectation__salle", "affectation__site")
        .order_by("detail_commande_id", "pk")
    )
    return [
        [[p(a.detail_commande.libelle), p(a.detail_commande.article_id or "", PETIT)],
         nombre(a.quantite_validee), a.affectation.nom]
        for a in attributions
    ]


def generer_accuse_reception(commande):
    demandeur, chef, traiteur = commande.employe_demandeur, commande.employe_prevalidateur, commande.employe_traitant
    blocs = [
        section("Informations de la demande"),
        informations([("Date de la demande", date_fr(commande.date_commande)),
                      ("Objet", commande.objet or "—")]),
        section("Demandeur"),
        _employe(demandeur),
        section("Articles accordés"),
        tableau(["Article", "Quantité", "Bénéficiaire"], _articles_accordes(commande) or _SANS_LIGNE,
                [8.4 * cm, 2.4 * cm, 6.6 * cm]),
        section("Pré-validateur"),
        _employe(chef, "Pré-validée le", commande.date_prevalidation),
        section("Traiteur"),
        _employe(traiteur, "Traitée le", commande.date_traitement),
        section("Signatures"),
        signatures([(getattr(demandeur, "emp_nom", "")),
                    (getattr(chef, "emp_nom", "")),
                    (getattr(traiteur, "emp_nom", ""))]),
    ]
    return fiche_pdf("Accusé de réception de matériel", f"Commande n°{commande.pk}", "Validée", blocs)
