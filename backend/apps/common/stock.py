"""Calcul du stock : source de vérité unique pour tout le backend.

Règles (inchangées par rapport à l'existant) pour un magasin M :

    + ENTREE / TRANSFERT / RETOUR dont la destination est M
    - SORTIE / TRANSFERT          dont la source est M
    + AJUSTEMENT sans source       dont la destination est M (écart positif)
    - AJUSTEMENT sans destination  dont la source est M      (écart négatif)

Sans magasin précis (stock global), un TRANSFERT s'annule (+/-) et seuls les
ajustements rattachés à un magasin sont comptés.

Pour un bénéficiaire (direction, site, salle), le stock détenu vaut :
    sorties - retours + ajustements positifs - ajustements négatifs.

Toutes les fonctions calculent les quatre composantes dans une SEULE requête
SQL (sommes conditionnelles), là où l'ancien code en faisait quatre, souvent
dans une boucle par article ou par magasin.
"""
from collections import defaultdict

from django.db.models import IntegerField, Max, Q, Sum, Value
from django.db.models.functions import Coalesce

from apps.stock.models import DetailMouvement, Mouvement

MOTIF_ECART_POSITIF = "Régularisation d'écart positif"
MOTIF_ECART_NEGATIF = "Régularisation d'écart négatif"

TYPES_ENTREE = (Mouvement.Type.ENTREE, Mouvement.Type.TRANSFERT, Mouvement.Type.RETOUR)
TYPES_SORTIE = (Mouvement.Type.SORTIE, Mouvement.Type.TRANSFERT)


# --------------------------------------------------------------------------
# Filtres élémentaires
# --------------------------------------------------------------------------
def filtres_stock(prefix="", magasin_id=None):
    """Les quatre filtres ``Q`` (entree, sortie, ajustement_plus, ajustement_moins).

    ``prefix`` désigne le chemin vers ``DetailMouvement`` depuis le modèle
    interrogé (ex. ``"details_mouvement__"`` depuis ``Article``).
    """
    m = f"{prefix}mouvement__"
    filtres = {
        "entree": Q(**{f"{m}type_mouvement__in": TYPES_ENTREE}),
        "sortie": Q(**{f"{m}type_mouvement__in": TYPES_SORTIE}),
        "ajustement_plus": Q(**{
            f"{m}type_mouvement": Mouvement.Type.AJUSTEMENT,
            f"{m}magasin_source__isnull": True,
        }),
        "ajustement_moins": Q(**{
            f"{m}type_mouvement": Mouvement.Type.AJUSTEMENT,
            f"{m}magasin_destination__isnull": True,
        }),
    }
    if magasin_id:
        filtres["entree"] &= Q(**{f"{m}magasin_destination_id": magasin_id})
        filtres["sortie"] &= Q(**{f"{m}magasin_source_id": magasin_id})
        filtres["ajustement_plus"] &= Q(**{f"{m}magasin_destination_id": magasin_id})
        filtres["ajustement_moins"] &= Q(**{f"{m}magasin_source_id": magasin_id})
    else:
        filtres["ajustement_plus"] &= Q(**{f"{m}magasin_destination__isnull": False})
        filtres["ajustement_moins"] &= Q(**{f"{m}magasin_source__isnull": False})
    return filtres


def _somme(champ, condition):
    return Coalesce(Sum(champ, filter=condition), Value(0), output_field=IntegerField())


def expression_stock(prefix="details_mouvement__", magasin_id=None, date_max=None):
    """Expression d'agrégat du stock, utilisable dans ``annotate()`` ou ``aggregate()``.

    ``date_max`` (datetime aware, exclusive) limite aux mouvements antérieurs.
    """
    filtres = filtres_stock(prefix, magasin_id)
    if date_max is not None:
        borne = Q(**{f"{prefix}mouvement__date__lt": date_max})
        filtres = {nom: condition & borne for nom, condition in filtres.items()}
    champ = f"{prefix}quantite"
    return (
        _somme(champ, filtres["entree"])
        - _somme(champ, filtres["sortie"])
        + _somme(champ, filtres["ajustement_plus"])
        - _somme(champ, filtres["ajustement_moins"])
    )


def annoter_stock(queryset, magasin_id=None, nom="stock_calcule", prefix="details_mouvement__"):
    """Annote un queryset (d'``Article`` par défaut) avec son stock calculé."""
    return queryset.annotate(**{nom: expression_stock(prefix, magasin_id)})


# --------------------------------------------------------------------------
# Stock en magasin
# --------------------------------------------------------------------------
def stock_article_magasin(article, magasin_id, date_max=None) -> int:
    """Stock d'un article dans un magasin (une requête)."""
    return DetailMouvement.objects.filter(article=article).aggregate(
        total=expression_stock(prefix="", magasin_id=magasin_id, date_max=date_max)
    )["total"] or 0


def stocks_articles_magasin(magasin_id, date_max=None) -> dict:
    """``{code_article: stock}`` pour tous les articles mouvementés dans un magasin."""
    lignes = (
        DetailMouvement.objects.values("article")
        .annotate(stock=expression_stock(prefix="", magasin_id=magasin_id, date_max=date_max))
        .order_by()
    )
    return {ligne["article"]: ligne["stock"] for ligne in lignes}


def stocks_par_magasin(article=None) -> dict:
    """``{magasin_id: stock}`` (tous articles ou un seul) en deux requêtes groupées.

    Côté destination : entrées et ajustements positifs ; côté source :
    sorties et ajustements négatifs. Remplace la boucle « 4 requêtes par
    magasin » de l'ancien code.
    """
    base = DetailMouvement.objects.all()
    if article is not None:
        base = base.filter(article=article)

    plus = Q(mouvement__type_mouvement__in=TYPES_ENTREE) | Q(
        mouvement__type_mouvement=Mouvement.Type.AJUSTEMENT,
        mouvement__magasin_source__isnull=True,
    )
    moins = Q(mouvement__type_mouvement__in=TYPES_SORTIE) | Q(
        mouvement__type_mouvement=Mouvement.Type.AJUSTEMENT,
        mouvement__magasin_destination__isnull=True,
    )

    stocks = defaultdict(int)
    for ligne in (
        base.filter(plus, mouvement__magasin_destination__isnull=False)
        .values("mouvement__magasin_destination")
        .annotate(total=Sum("quantite"))
        .order_by()
    ):
        stocks[ligne["mouvement__magasin_destination"]] += ligne["total"] or 0
    for ligne in (
        base.filter(moins, mouvement__magasin_source__isnull=False)
        .values("mouvement__magasin_source")
        .annotate(total=Sum("quantite"))
        .order_by()
    ):
        stocks[ligne["mouvement__magasin_source"]] -= ligne["total"] or 0
    return dict(stocks)


# --------------------------------------------------------------------------
# Stock détenu par un bénéficiaire (direction, site, salle)
# --------------------------------------------------------------------------
def _expression_beneficiaire():
    type_ = "mouvement__type_mouvement"
    return (
        _somme("quantite", Q(**{type_: Mouvement.Type.SORTIE}))
        - _somme("quantite", Q(**{type_: Mouvement.Type.RETOUR}))
        + _somme("quantite", Q(**{type_: Mouvement.Type.AJUSTEMENT},
                               mouvement__motif=MOTIF_ECART_POSITIF))
        - _somme("quantite", Q(**{type_: Mouvement.Type.AJUSTEMENT},
                               mouvement__motif=MOTIF_ECART_NEGATIF))
    )


def _details_beneficiaire(filtre_beneficiaire, date_max=None):
    queryset = DetailMouvement.objects.filter(filtre_beneficiaire)
    if date_max is not None:
        queryset = queryset.filter(mouvement__date__lt=date_max)
    return queryset


def stock_article_beneficiaire(article, filtre_beneficiaire, date_max=None) -> int:
    """Stock d'un article détenu par un bénéficiaire (une requête)."""
    return _details_beneficiaire(filtre_beneficiaire, date_max).filter(article=article).aggregate(
        total=_expression_beneficiaire()
    )["total"] or 0


def stocks_articles_beneficiaire(filtre_beneficiaire, date_max=None) -> dict:
    """``{code_article: stock}`` détenu par un bénéficiaire (une requête groupée)."""
    lignes = (
        _details_beneficiaire(filtre_beneficiaire, date_max)
        .values("article")
        .annotate(stock=_expression_beneficiaire())
        .order_by()
    )
    return {ligne["article"]: ligne["stock"] for ligne in lignes}


def fournitures_detenues(filtre_beneficiaire):
    """Fournitures (articles non immobilisés, sans unité) détenues par bénéficiaire :
    ``[{"affectation", "article", "quantite", "derniere_reception"}]`` (quantité positive seulement)."""
    return list(
        DetailMouvement.objects.filter(filtre_beneficiaire, article__is_immobilisation=False, affectation__isnull=False)
        .values("affectation", "article")
        .annotate(quantite=_expression_beneficiaire(),
                  derniere_reception=Max("mouvement__date", filter=Q(mouvement__type_mouvement=Mouvement.Type.SORTIE)))
        .filter(quantite__gt=0)
        .order_by()
    )
