from rest_framework import filters, viewsets

from apps.catalogue.models import ArticleFournisseur, Fournisseur
from apps.catalogue.serializers import (
    ArticleFournisseurSerializer,
    FournisseurSerializer,
)

from .categorie import CategorieViewSet


class FournisseurViewSet(viewsets.ModelViewSet):
    queryset = Fournisseur.objects.all()
    serializer_class = FournisseurSerializer
    permission_classes = CategorieViewSet.permission_classes
    filter_backends = [filters.SearchFilter]  # noqa: RUF012
    search_fields = ["nom"]  # noqa: RUF012

class ArticleFournisseurViewSet(viewsets.ModelViewSet):
    queryset = ArticleFournisseur.objects.all().select_related("article", "fournisseur")
    serializer_class = ArticleFournisseurSerializer
    permission_classes = CategorieViewSet.permission_classes

