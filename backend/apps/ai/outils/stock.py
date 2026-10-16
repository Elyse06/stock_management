"""Outils de stock : indicateurs, mouvements, unités attribuées, inventaires.

Droits identiques à l'API : indicateurs (CAT_LIRE ou MOV_LIRE), mouvements
(MOV_LIRE), unités (CAT_LIRE ou INV_LIRE), inventaires (INV_LIRE).
"""
from django.db.models import F, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.catalogue.models import Article
from apps.common import actions as a
from apps.common.dates import plage_mois
from apps.common.stock import annoter_stock
from apps.stock.models import DetailMouvement, InventaireSession, Mouvement, UniteArticle

from .base import Outil, Resultat, entier, lien, lien_unique, tableau, texte
from .periodes import parametres_periode, plage
from .texte import filtrer_tolerant

CHAMPS_ARTICLE = ("article__designation", "article__code_article")
CHAMPS_BENEFICIAIRE = ("affectation__employe__emp_nom", "affectation__employe__emp_matricule", "affectation__direction__dir_libelle",
                       "affectation__direction__dir_description", "affectation__salle__nom", "affectation__site__site_nom")

ENTREES = Q(mouvement__type_mouvement__in=(Mouvement.Type.ENTREE, Mouvement.Type.RETOUR))
SORTIES = Q(mouvement__type_mouvement=Mouvement.Type.SORTIE)


def _indicateurs(contexte):
    debut_mois, _, _ = plage_mois()
    articles = annoter_stock(Article.objects.all())
    sous_seuil = list(articles.filter(stock_calcule__lt=F("seuil")).order_by("stock_calcule")[:10])
    mois = DetailMouvement.objects.filter(mouvement__date__gte=debut_mois)
    donnees = {
        "articles": articles.count(),
        "quantite_en_stock": articles.aggregate(t=Coalesce(Sum("stock_calcule"), 0))["t"],
        "en_rupture": articles.filter(stock_calcule__lte=0).count(),
        "sous_le_seuil": articles.filter(stock_calcule__lt=F("seuil")).count(),
        "entrees_du_mois": mois.filter(ENTREES).aggregate(t=Coalesce(Sum("quantite"), 0))["t"],
        "sorties_du_mois": mois.filter(SORTIES).aggregate(t=Coalesce(Sum("quantite"), 0))["t"],
        "articles_sous_le_seuil": [
            {"code": x.code_article, "designation": x.designation, "stock": x.stock_calcule, "seuil": x.seuil}
            for x in sous_seuil
        ],
    }
    return Resultat(
        pour_ia=donnees,
        tableau=tableau("Articles sous le seuil", ["Article", "Stock", "Seuil"],
                        [[x.designation, x.stock_calcule, x.seuil] for x in sous_seuil], donnees["sous_le_seuil"])
        if sous_seuil else None,
        liens=lien(contexte, "Ouvrir le tableau de bord", "/"),
    )


def _mouvements(contexte, type=None, article=None, periode=None, date_debut=None, date_fin=None, limite=15):
    debut, fin, libelle = plage(periode, date_debut, date_fin)
    details = DetailMouvement.objects.select_related(
        "mouvement__magasin_source", "mouvement__magasin_destination", "article"
    ).filter(mouvement__date__gte=debut, mouvement__date__lt=fin)
    if type:
        details = details.filter(mouvement__type_mouvement=type)
    if article:
        details = filtrer_tolerant(details, article, CHAMPS_ARTICLE)
    total = details.count()
    # Totaux exacts calculés en base (la liste renvoyée au modèle est limitée).
    totaux = {Mouvement.Type(t).label: q for t, q in
              details.order_by().values_list("mouvement__type_mouvement").annotate(q=Coalesce(Sum("quantite"), 0))}
    lignes = list(details.order_by("-mouvement__date")[:limite])

    def trajet(d):
        m = d.mouvement
        return " → ".join(x.magasin_nom for x in (m.magasin_source, m.magasin_destination) if x) or "—"

    return Resultat(
        pour_ia={"periode": libelle, "total_lignes": total, "quantites_par_type": totaux, "mouvements": [
            {"date": f"{timezone.localtime(d.mouvement.date):%d/%m/%Y}", "type": d.mouvement.get_type_mouvement_display(),
             "article": d.article.designation, "quantite": d.quantite, "trajet": trajet(d)}
            for d in lignes
        ]},
        tableau=tableau(f"Mouvements {libelle}", ["Date", "Type", "Article", "Qté"],
                        [[f"{timezone.localtime(d.mouvement.date):%d/%m/%Y}", d.mouvement.get_type_mouvement_display(),
                          d.article.designation, d.quantite] for d in lignes], total,
                        lien_unique(contexte, "Voir l'historique", "/historique/globale")),
    )


def _unites(contexte, beneficiaire=None, article=None, numero_serie=None, limite=15):
    unites = UniteArticle.objects.filter(statut=UniteArticle.Statut.ATTRIBUE).select_related(
        "article", "affectation__employe", "affectation__direction", "affectation__salle", "affectation__site"
    )
    if beneficiaire:
        unites = filtrer_tolerant(unites, beneficiaire, CHAMPS_BENEFICIAIRE)
    if article:
        unites = filtrer_tolerant(unites, article, CHAMPS_ARTICLE)
    if numero_serie:
        unites = unites.filter(numero_de_serie__icontains=numero_serie)
    total = unites.count()
    lignes = list(unites.order_by("article__designation")[:limite])
    return Resultat(
        pour_ia={"total": total, "unites": [
            {"article": u.article.designation, "numero_serie": u.numero_de_serie, "etat": u.get_etat_display(),
             "beneficiaire": u.employe_attribue_nom, "type_beneficiaire": u.beneficiaire_type}
            for u in lignes
        ]},
        tableau=tableau("Unités attribuées", ["Article", "N° de série", "Bénéficiaire", "État"],
                        [[u.article.designation, u.numero_de_serie or "—", u.employe_attribue_nom, u.get_etat_display()]
                         for u in lignes], total,
                        lien_unique(contexte, "Voir les unités attribuées", "/inventaire/unites")),
    )


def _inventaires(contexte, statut=None, periode=None, date_debut=None, date_fin=None, limite=10):
    sessions = InventaireSession.objects.select_related("magasin", "direction", "site", "salle")
    if periode or date_debut or date_fin:
        debut, fin, _ = plage(periode, date_debut, date_fin)
        sessions = sessions.filter(date_creation__gte=debut, date_creation__lt=fin)
    if statut:
        sessions = sessions.filter(statut=statut)
    total = sessions.count()
    lignes = list(sessions.order_by("-date_creation")[:limite])

    def lieu(s):
        return (s.magasin and s.magasin.magasin_nom) or (s.direction and s.direction.dir_libelle) \
            or (s.salle and s.salle.nom) or (s.site and s.site.site_nom) or "—"

    return Resultat(
        pour_ia={"total": total, "inventaires": [
            {"reference": s.code_reference, "date": f"{timezone.localtime(s.date_creation):%d/%m/%Y}",
             "lieu": lieu(s), "statut": s.get_statut_display()} for s in lignes
        ]},
        tableau=tableau("Inventaires", ["Référence", "Date", "Lieu", "Statut"],
                        [[s.code_reference, f"{timezone.localtime(s.date_creation):%d/%m/%Y}", lieu(s), s.get_statut_display()]
                         for s in lignes], total,
                        lien_unique(contexte, "Voir les inventaires", "/inventaire/sessions")),
    )


OUTILS = [
    Outil("indicateurs_stock",
          "Chiffres clés du stock : nombre d'articles, quantité totale, ruptures, articles sous le seuil (liste), "
          "entrées et sorties du mois en cours.", {}, _indicateurs, (a.CAT_LIRE, a.MOV_LIRE)),
    Outil("mouvements_recents", "Derniers mouvements de stock (entrées, sorties, transferts, ajustements, retours).", {
        "type": texte("Type de mouvement.", enum=list(Mouvement.Type.values)),
        "article": texte("Code ou désignation d'article."),
        **parametres_periode(),
        "limite": entier("Nombre maximum de lignes (15 par défaut)."),
    }, _mouvements, (a.MOV_LIRE,)),
    Outil("unites_attribuees",
          "Unités (matériel identifié) attribuées à un employé, une direction, une salle ou un site.", {
              "beneficiaire": texte("Nom ou matricule de l'employé, ou nom de la direction, salle ou site."),
              "article": texte("Code ou désignation d'article."),
              "numero_serie": texte("Numéro de série (ou partie)."),
              "limite": entier("Nombre maximum de lignes (15 par défaut)."),
          }, _unites, (a.CAT_LIRE, a.INV_LIRE)),
    Outil("inventaires", "Sessions d'inventaire récentes et leur statut.", {
        "statut": texte("Statut de la session.", enum=list(InventaireSession.Statut.values)),
        **parametres_periode(),
        "limite": entier("Nombre maximum de sessions (10 par défaut)."),
    }, _inventaires, (a.INV_LIRE,)),
]
