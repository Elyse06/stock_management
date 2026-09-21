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
    queryset = (
        Article.objects.all()
        .select_related("categorie")
        .prefetch_related("fournisseurs_liaison__fournisseur")
    )
    serializer_class = ArticleSerializer
    lookup_field = "code_article"
    permission_classes = CategorieViewSet.permission_classes
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]  # noqa: RUF012
    filterset_fields = ["categorie", "mode_suivi"]  # noqa: RUF012
    search_fields = ["code_article", "designation", "code_barre"]  # noqa: RUF012

    def get_queryset(self):
        queryset = Article.objects.select_related("categorie").prefetch_related(
            "fournisseurs_liaison__fournisseur"
        )

        magasin_id = self.request.query_params.get("magasin_id")
        
        stock_filters = build_stock_filters(
            relation_prefix="details_mouvement__",
            magasin_id=magasin_id,
        )
        
        return queryset.annotate(
            stock_calcule=(
                Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["entree"]), 0)
                - Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["sortie"]), 0)
                + Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["ajustement_plus"]), 0)
                - Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["ajustement_moins"]), 0)
            )
        )

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
            return Response(
                {"error": "Article non trouvé."},
                status=404
            )
        return Response(data)
  