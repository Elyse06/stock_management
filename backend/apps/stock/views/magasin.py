from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.catalogue.models import Article
from apps.common import actions
from apps.common.permissions import HasAction
from apps.common.stock import stocks_articles_magasin
from apps.stock.models import Magasin
from apps.stock.serializers import MagasinSerializer

from .permissions import LieuPermission


class MagasinViewSet(viewsets.ModelViewSet):
    queryset = Magasin.objects.select_related("localite").order_by("pk")
    serializer_class = MagasinSerializer
    permission_classes = [LieuPermission]  # noqa: RUF012

    @action(detail=True, methods=["get"], permission_classes=[HasAction.for_actions(actions.INV_LIRE)])
    def stocks(self, request, pk=None):
        magasin = self.get_object()
        stocks = stocks_articles_magasin(magasin.pk)
        designations = dict(
            Article.objects.filter(code_article__in=stocks).values_list("code_article", "designation")
        )
        return Response({
            code: {
                "article_code": code,
                "article_designation": designations[code],
                "stock_theorique": stock,
            }
            for code, stock in stocks.items()
            if code in designations
        })
