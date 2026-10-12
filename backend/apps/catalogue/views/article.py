from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.catalogue.models import Article
from apps.catalogue.serializers import ArticleSerializer
from apps.catalogue.services import get_fiche_article_complete
from apps.common import actions
from apps.common.params import parse_int
from apps.common.permissions import HasAction
from apps.common.stock import annoter_stock

from .permissions import CataloguePermission


class ArticleViewSet(viewsets.ModelViewSet):
    serializer_class = ArticleSerializer
    lookup_field = "code_article"
    permission_classes = [CataloguePermission]  # noqa: RUF012
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]  # noqa: RUF012
    filterset_fields = ["categorie", "mode_suivi", "is_immobilisation"]  # noqa: RUF012
    search_fields = ["code_article", "designation", "code_barre"]  # noqa: RUF012

    def _magasin_id(self):
        return parse_int(self.request.query_params.get("magasin_id"), minimum=1)

    def get_queryset(self):
        queryset = Article.objects.select_related("categorie").order_by("code_article")
        if getattr(self, "action", None) == "list":
            return queryset
        return annoter_stock(queryset, magasin_id=self._magasin_id())

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        articles = page if page is not None else list(queryset)

        codes = [article.code_article for article in articles]
        stocks = dict(
            annoter_stock(Article.objects.filter(code_article__in=codes), magasin_id=self._magasin_id())
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
        permission_classes=[HasAction.for_actions(actions.CAT_LIRE)],
        url_path="fiche-complete",
    )
    def fiche_complete(self, request, code_article=None):
        data = get_fiche_article_complete(code_article)
        if data is None:
            return Response({"error": "Article non trouvé."}, status=404)
        return Response(data)
