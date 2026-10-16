"""Outils d'analyse : calculs exacts faits en base, que le modèle commente sans les refaire.

Consommation regroupée, comparaison de périodes, réapprovisionnement, valeur du stock.
"""
import math
from collections import defaultdict
from datetime import timedelta

from django.conf import settings
from django.db.models import F, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.catalogue.models import Article
from apps.common import actions as a
from apps.common.stock import annoter_stock
from apps.stock.models import DetailMouvement, Mouvement

from .base import Outil, Resultat, entier, lien_unique, tableau, texte
from .periodes import PERIODES, parametres_periode, plage
from .texte import filtrer_tolerant

MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
CHAMPS_ARTICLE = ("article__designation", "article__code_article")
CHAMPS_DIRECTION = ("affectation__direction__dir_libelle", "affectation__direction__dir_description",
                    "affectation__employe__emp_dir_id__dir_libelle", "affectation__employe__emp_dir_id__dir_description")
REGROUPEMENTS = {
    "article": F("article__designation"),
    "categorie": Coalesce("article__categorie__cat_description", "article__categorie__cat_libelle"),
    "direction": Coalesce("affectation__direction__dir_libelle", "affectation__employe__emp_dir_id__dir_libelle"),
    "beneficiaire": Coalesce("affectation__employe__emp_nom", "affectation__direction__dir_libelle",
                             "affectation__salle__nom", "affectation__site__site_nom"),
    "magasin": F("mouvement__magasin_source__magasin_nom"),
}
TYPES_FLUX = {"SORTIE": (Mouvement.Type.SORTIE,), "ENTREE": (Mouvement.Type.ENTREE, Mouvement.Type.RETOUR)}


def nombre(valeur):
    valeur = float(valeur or 0)
    return str(int(valeur)) if valeur == int(valeur) else f"{valeur:.1f}".replace(".", ",")


def ariary(valeur):
    return f"{round(valeur):,}".replace(",", " ") + " Ar"


def _flux(type_flux, debut, fin, article=None, direction=None):
    details = DetailMouvement.objects.filter(mouvement__type_mouvement__in=TYPES_FLUX[type_flux],
                                             mouvement__date__gte=debut, mouvement__date__lt=fin)
    if article:
        details = filtrer_tolerant(details, article, CHAMPS_ARTICLE)
    if direction:
        details = filtrer_tolerant(details, direction, CHAMPS_DIRECTION)
    return details


def _par_mois(details):
    cumul = defaultdict(float)
    for quand, quantite in details.values_list("mouvement__date", "quantite"):
        local = timezone.localtime(quand)
        cumul[(local.year, local.month)] += float(quantite)
    return [(f"{MOIS[mois - 1]} {annee}", q) for (annee, mois), q in sorted(cumul.items())]


def _groupes(details, regroupement):
    if regroupement == "mois":
        return _par_mois(details)
    lignes = (details.order_by().annotate(groupe=REGROUPEMENTS[regroupement]).values("groupe")
              .annotate(q=Sum("quantite")).order_by("-q").values_list("groupe", "q"))
    return [(nom or "Non précisé", float(q)) for nom, q in lignes]


def _consommation(contexte, regroupement="article", article=None, direction=None, periode=None, date_debut=None,
                  date_fin=None, limite=15):
    debut, fin, libelle = plage(periode, date_debut, date_fin, defaut="3_derniers_mois")
    details = _flux("SORTIE", debut, fin, article, direction)
    total = float(details.aggregate(t=Coalesce(Sum("quantite"), 0))["t"])
    groupes = _groupes(details, regroupement)
    return Resultat(
        pour_ia={"periode": libelle, "regroupement": regroupement, "quantite_totale_sortie": total,
                 "groupes": [{"nom": n, "quantite": q} for n, q in groupes[:limite]], "nombre_de_groupes": len(groupes)},
        tableau=tableau(f"Consommation {libelle} : {nombre(total)} au total", [regroupement.capitalize(), "Quantité sortie"],
                        [[n, nombre(q)] for n, q in groupes], len(groupes), lien_unique(contexte, "Voir l'historique", "/historique/globale")),
    )


def _comparer(contexte, periode_a="mois_dernier", periode_b="ce_mois", type_flux="SORTIE", article=None, direction=None):
    resultats = []
    for periode in (periode_a, periode_b):
        debut, fin, libelle = plage(periode)
        details = _flux(type_flux, debut, fin, article, direction)
        resultats.append((libelle, float(details.aggregate(t=Coalesce(Sum("quantite"), 0))["t"]), dict(_groupes(details, "article"))))
    (lib_a, total_a, par_a), (lib_b, total_b, par_b) = resultats
    evolution = round(100 * (total_b - total_a) / total_a) if total_a else None
    articles = sorted(set(par_a) | set(par_b), key=lambda n: -max(par_a.get(n, 0), par_b.get(n, 0)))[:12]
    nature = "sorties" if type_flux == "SORTIE" else "entrées"
    return Resultat(
        pour_ia={"nature": nature, "periode_a": {"libelle": lib_a, "total": total_a}, "periode_b": {"libelle": lib_b, "total": total_b},
                 "evolution_pourcentage": evolution,
                 "par_article": [{"article": n, "periode_a": par_a.get(n, 0), "periode_b": par_b.get(n, 0)} for n in articles]},
        tableau=tableau(f"Comparaison des {nature}", ["Article", lib_a, lib_b],
                        [["Total", nombre(total_a), nombre(total_b)]] + [[n, nombre(par_a.get(n, 0)), nombre(par_b.get(n, 0))] for n in articles]),
    )


def _reapprovisionnement(contexte, article=None, categorie=None, limite=15):
    rythme_jours, couverture, urgence = settings.ASSISTANT_RYTHME_JOURS, settings.ASSISTANT_COUVERTURE_JOURS, settings.ASSISTANT_URGENCE_JOURS
    articles = annoter_stock(Article.objects.select_related("categorie"))
    if article:
        articles = filtrer_tolerant(articles, article, ("designation", "code_article", "modele"))
    if categorie:
        articles = filtrer_tolerant(articles, categorie, ("categorie__cat_libelle", "categorie__cat_description"))
    debut = timezone.now() - timedelta(days=rythme_jours)
    consommes = dict(DetailMouvement.objects.filter(mouvement__type_mouvement=Mouvement.Type.SORTIE, mouvement__date__gte=debut)
                     .order_by().values("article_id").annotate(q=Sum("quantite")).values_list("article_id", "q"))
    lignes = []
    for x in articles:
        stock, par_jour = float(x.stock_calcule), float(consommes.get(x.pk, 0)) / rythme_jours
        jours = math.inf if par_jour == 0 else stock / par_jour
        conseille = max(0, math.ceil(par_jour * couverture + x.seuil - stock))
        if article or stock < x.seuil or jours < urgence:
            lignes.append((x, stock, par_jour, jours, conseille))
    lignes.sort(key=lambda ligne: (ligne[1] > 0, ligne[3], ligne[0].designation))

    def jours_txt(stock, j):
        return "rupture" if stock <= 0 else ("—" if j == math.inf else f"{math.floor(j)} j")
    return Resultat(
        pour_ia={"hypotheses": f"rythme calculé sur les {rythme_jours} derniers jours ; quantité conseillée pour tenir {couverture} jours "
                               "sans passer sous le seuil", "nombre": len(lignes), "articles": [
            {"code": x.code_article, "designation": x.designation, "stock": stock, "seuil": x.seuil,
             "consommation_par_mois": round(par_jour * 30, 1), "jours_de_stock_restants": None if j == math.inf else math.floor(j),
             "quantite_conseillee": c} for x, stock, par_jour, j, c in lignes[:limite]]},
        tableau=tableau("Articles à réapprovisionner", ["Article", "Stock", "Conso./mois", "Reste", "À commander"],
                        [[x.designation, nombre(stock), nombre(round(par_jour * 30, 1)), jours_txt(stock, j), c] for x, stock, par_jour, j, c in lignes],
                        len(lignes), lien_unique(contexte, "Voir le catalogue", "/catalogue/articles")),
    )


def _valeur_stock(contexte, categorie=None, limite=10):
    achats = defaultdict(lambda: [0.0, 0.0])  # article -> [quantité achetée avec prix, montant]
    for article_id, quantite, prix in DetailMouvement.objects.filter(
            mouvement__type_mouvement=Mouvement.Type.ENTREE, prix_achat__isnull=False).values_list("article_id", "quantite", "prix_achat"):
        achats[article_id][0] += float(quantite)
        achats[article_id][1] += float(quantite) * float(prix)
    articles = annoter_stock(Article.objects.select_related("categorie")).filter(stock_calcule__gt=0)
    if categorie:
        articles = filtrer_tolerant(articles, categorie, ("categorie__cat_libelle", "categorie__cat_description"))
    valorises, sans_prix, par_famille = [], [], defaultdict(float)
    for x in articles:
        quantite, montant = achats.get(x.pk, (0, 0))
        if not quantite:
            sans_prix.append(x)
            continue
        valeur = float(x.stock_calcule) * montant / quantite
        valorises.append((x, montant / quantite, valeur))
        par_famille[x.categorie.cat_description or x.categorie.cat_libelle if x.categorie else "Sans catégorie"] += valeur
    valorises.sort(key=lambda v: -v[2])
    total = sum(v for _, _, v in valorises)
    return Resultat(
        pour_ia={"methode": "stock actuel × prix d'achat moyen pondéré des entrées", "valeur_totale": ariary(total),
                 "par_famille": {f: ariary(v) for f, v in sorted(par_famille.items(), key=lambda i: -i[1])},
                 "principaux_articles": [{"article": x.designation, "prix_moyen": ariary(p), "valeur": ariary(v)} for x, p, v in valorises[:limite]],
                 "articles_sans_prix": {"nombre": len(sans_prix), "exemples": [x.designation for x in sans_prix[:5]]}},
        tableau=tableau(f"Valeur du stock : {ariary(total)}", ["Article", "Stock", "Prix moyen", "Valeur"],
                        [[x.designation, nombre(x.stock_calcule), ariary(p), ariary(v)] for x, p, v in valorises], len(valorises)),
    )


OUTILS = [
    Outil("consommation", "Quantités SORTIES du stock (consommation) sur une période, regroupées par article, catégorie, direction, "
          "bénéficiaire, magasin ou mois. Calculées en base : chiffres exacts.", {
              "regroupement": texte("Regroupement des résultats.", enum=["article", "categorie", "direction", "beneficiaire", "magasin", "mois"]),
              "article": texte("Article (désignation ou code), facultatif."),
              "direction": texte("Direction bénéficiaire, facultatif."),
              **parametres_periode(), "limite": entier("Nombre maximum de groupes (15 par défaut)."),
          }, _consommation, (a.MOV_LIRE,)),
    Outil("comparer_periodes", "Compare les sorties (ou les entrées) de deux périodes : totaux, évolution en %, détail par article.", {
        "periode_a": texte("Première période (la plus ancienne).", enum=PERIODES),
        "periode_b": texte("Seconde période (la plus récente).", enum=PERIODES),
        "type_flux": texte("SORTIE (consommation, par défaut) ou ENTREE.", enum=list(TYPES_FLUX)),
        "article": texte("Article, facultatif."), "direction": texte("Direction, facultatif."),
    }, _comparer, (a.MOV_LIRE,)),
    Outil("reapprovisionnement", "Articles à commander : stock, consommation mensuelle, jours de stock restants et quantité "
          "conseillée. Sans filtre : seulement les articles prioritaires (sous le seuil ou bientôt en rupture).", {
              "article": texte("Article précis, facultatif."), "categorie": texte("Catégorie, facultatif."),
              "limite": entier("Nombre maximum d'articles (15 par défaut)."),
          }, _reapprovisionnement, (a.CAT_LIRE, a.MOV_LIRE)),
    Outil("valeur_stock", "Valeur du stock au prix d'achat moyen : total, par famille, principaux articles, articles sans prix connu.", {
        "categorie": texte("Catégorie, facultatif."), "limite": entier("Nombre d'articles détaillés (10 par défaut)."),
    }, _valeur_stock, (a.CAT_GERE,)),
]
