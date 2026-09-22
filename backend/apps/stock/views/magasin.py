from apps.catalogue.models import Article
from apps.catalogue.services.stock_filters import build_stock_filters
from apps.common.permissions import HasAction, HasActionByMethod
from apps.stock.models import (
    DetailMouvement,
    Magasin,
    Mouvement,
)
from apps.stock.serializers import MagasinSerializer
from django.db.models import Sum
from django.db.models.functions import Coalesce
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response


class MagasinViewSet(viewsets.ModelViewSet):
    queryset = Magasin.objects.all().select_related("localite")
    serializer_class = MagasinSerializer
    permission_classes = [  # noqa: RUF012
        HasActionByMethod.for_methods(
                    GET=("CAT_LIRE",),
                    HEAD=("CAT_LIRE",),
                    OPTIONS=("CAT_LIRE",),
                    **{"*": ("INV_GERE",)},
                )
    ]

    @action(
        detail=True,
        methods=["get"],
        permission_classes=[HasAction.for_actions("INV_LIRE")],
    )
    def stocks(self, request, pk=None):
        magasin = self.get_object()
        stock_filters = build_stock_filters(magasin_id=magasin.pk)
        entrees = DetailMouvement.objects.filter(
            stock_filters["entree"],
        ).values("article").annotate(total=Coalesce(Sum("quantite"), 0))
        sorties = DetailMouvement.objects.filter(
            stock_filters["sortie"],
        ).values("article").annotate(total=Coalesce(Sum("quantite"), 0))
        ajustements_plus = DetailMouvement.objects.filter(
            stock_filters["ajustement_plus"],
        ).values("article").annotate(total=Coalesce(Sum("quantite"), 0))
        ajustements_moins = DetailMouvement.objects.filter(
            stock_filters["ajustement_moins"],
        ).values("article").annotate(total=Coalesce(Sum("quantite"), 0))

        entrees_dict = {e["article"]: e["total"] for e in entrees}
        sorties_dict = {s["article"]: s["total"] for s in sorties}
        ajust_plus_dict = {a["article"]: a["total"] for a in ajustements_plus}
        ajust_moins_dict = {a["article"]: a["total"] for a in ajustements_moins}

        all_article_ids = set(
            list(entrees_dict.keys()) +
            list(sorties_dict.keys()) +
            list(ajust_plus_dict.keys()) +
            list(ajust_moins_dict.keys())
        )

        stocks = {}
        for article in Article.objects.filter(code_article__in=all_article_ids):
            stock = (
                entrees_dict.get(article.code_article, 0) -
                sorties_dict.get(article.code_article, 0) +
                ajust_plus_dict.get(article.code_article, 0) -
                ajust_moins_dict.get(article.code_article, 0)
            )
            stocks[article.code_article] = {
                "article_code": article.code_article,
                "article_designation": article.designation,
                "stock_theorique": stock,
            }
        return Response(stocks)
