"""Accusé de réception d'une livraison de commande.

Une commande peut être livrée en plusieurs fois (validation partielle) : un accusé par livraison, qui ne
liste que le matériel remis ce jour-là.

Contenu, dans l'ordre, et rien d'autre : informations de la demande, demandeur, articles accordés
(sans numéro de série), pré-validateur (chef hiérarchique), traiteur (gestionnaire du stock), signatures.
"""
from reportlab.lib.units import cm

from apps.commande.models import AttributionDetailCommande, Commande
from apps.common.pdf import PETIT, date_fr, fiche_pdf, informations, nombre, p, section, signatures, tableau
from apps.stock.models import DetailMouvement

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
    """Commandes validées sans sortie enregistrée (anciennes données) : attributions validées."""
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


def _articles_livres(sortie):
    """Une ligne par article remis lors de cette livraison : article, quantité, bénéficiaire."""
    details = (DetailMouvement.objects.filter(mouvement=sortie)
               .select_related("article", "affectation__employe", "affectation__direction",
                               "affectation__salle", "affectation__site")
               .order_by("pk"))
    return [
        [[p(d.article.designation), p(d.article.code_article, PETIT)], nombre(d.quantite),
         d.affectation.nom if d.affectation_id else "—"]
        for d in details
    ]


def generer_accuse_reception(commande, livraison=None, numero=1, nombre_livraisons=1):
    """Accusé de la livraison ``livraison`` (sortie de stock), n° ``numero`` sur ``nombre_livraisons``."""
    demandeur, chef = commande.employe_demandeur, commande.employe_prevalidateur
    traiteur = (livraison.realise_par if livraison else None) or commande.employe_traitant
    date_traitement = livraison.date if livraison else commande.date_traitement
    infos = [("N° de commande", str(commande.pk)), ("Date de la demande", date_fr(commande.date_commande)),
             ("Objet", commande.objet or "—")]
    partielle = commande.statut != Commande.Statut.VALIDEE or nombre_livraisons > 1
    if livraison and partielle:
        infos.append(("Livraison", f"n°{numero} du {date_fr(livraison.date)}"))
    lignes = _articles_livres(livraison) if livraison else _articles_accordes(commande)
    blocs = [
        section("1. Informations de la demande"),
        informations(infos),
        section("2. Demandeur"),
        _employe(demandeur),
        section("3. Articles accordés"),
        tableau(["Article", "Quantité", "Bénéficiaire"], lignes or _SANS_LIGNE, [8.4 * cm, 2.4 * cm, 6.6 * cm]),
        section("4. Pré-validateur"),
        _employe(chef, "Pré-validée le", commande.date_prevalidation),
        section("5. Traiteur"),
        _employe(traiteur, "Traitée le", date_traitement),
        section("6. Signatures"),
        signatures([("Le demandeur", getattr(demandeur, "emp_nom", "")),
                    ("Le pré-validateur", getattr(chef, "emp_nom", "")),
                    ("Le traiteur", getattr(traiteur, "emp_nom", ""))]),
    ]
    statut = "Validée" if commande.statut == Commande.Statut.VALIDEE else "Livraison partielle"
    return fiche_pdf("Accusé de réception de matériel", f"Commande n°{commande.pk}", statut, blocs)
