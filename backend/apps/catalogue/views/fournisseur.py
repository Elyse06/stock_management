from rest_framework import filters, viewsets

from apps.catalogue.models import Fournisseur
from apps.catalogue.serializers import FournisseurSerializer

from .categorie import CategorieViewSet


class FournisseurViewSet(viewsets.ModelViewSet):
    queryset = Fournisseur.objects.all()
    serializer_class = FournisseurSerializer
    permission_classes = CategorieViewSet.permission_classes
    filter_backends = [filters.SearchFilter]  # noqa: RUF012
    search_fields = ["nom"]  # noqa: RUF012

