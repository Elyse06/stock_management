from rest_framework import filters, viewsets

from apps.catalogue.models import Fournisseur
from apps.catalogue.serializers import FournisseurSerializer

from .permissions import CataloguePermission


class FournisseurViewSet(viewsets.ModelViewSet):
    queryset = Fournisseur.objects.order_by("pk")
    serializer_class = FournisseurSerializer
    permission_classes = [CataloguePermission]  # noqa: RUF012
    filter_backends = [filters.SearchFilter]  # noqa: RUF012
    search_fields = ["nom"]  # noqa: RUF012
