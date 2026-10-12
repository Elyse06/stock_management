from rest_framework import viewsets

from apps.catalogue.models import Categorie
from apps.catalogue.serializers import CategorieSerializer

from .permissions import CataloguePermission


class CategorieViewSet(viewsets.ModelViewSet):
    queryset = Categorie.objects.order_by("pk")
    serializer_class = CategorieSerializer
    permission_classes = [CataloguePermission]  # noqa: RUF012
