from django.db.models import Sum
from django.db.models.functions import Coalesce
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.catalogue.models import Article
from apps.catalogue.serializers import ArticleSerializer
from apps.catalogue.services.stock_filters import build_stock_filters
from apps.common.permissions import HasAction

from .categorie import CategorieViewSet


class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.all().select_related("categorie")
    serializer_class = ArticleSerializer
    lookup_field = "code_article"
    permission_classes = CategorieViewSet.permission_classes
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]  # noqa: RUF012
    filterset_fields = ["categorie", "mode_suivi", "is_immobilisation"]  # noqa: RUF012
    search_fields = ["code_article", "designation", "code_barre"]  # noqa: RUF012

    def get_queryset(self):
        queryset = Article.objects.select_related("categorie").order_by("code_article")

        if self.action == "list":
            return queryset

        return self._with_stock(queryset)

    def _with_stock(self, queryset):
        stock_filters = build_stock_filters(
            relation_prefix="details_mouvement__",
            magasin_id=self.request.query_params.get("magasin_id"),
        )
        return queryset.annotate(
            stock_calcule=(
                Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["entree"]), 0)
                - Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["sortie"]), 0)
                + Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["ajustement_plus"]), 0)
                - Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["ajustement_moins"]), 0)
            )
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        articles = page if page is not None else list(queryset)

        codes = [a.code_article for a in articles]
        stocks = dict(
            self._with_stock(Article.objects.filter(code_article__in=codes))
            .values_list("code_article", "stock_calcule")
        )
        for article in articles:
            article.stock_calcule = stocks.get(article.code_article, 0)

        serializer = self.get_serializer(articles, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["get"],
        permission_classes=[HasAction.for_actions("CAT_LIRE")],
        url_path="fiche-complete",
    )
    def fiche_complete(self, request, code_article=None):
        from apps.catalogue.services import get_fiche_article_complete

        data = get_fiche_article_complete(code_article)
        if data is None:
            return Response({"error": "Article non trouvé."}, status=404)
        return Response(data)