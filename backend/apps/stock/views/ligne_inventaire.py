from apps.stock.models import LigneInventaire
from apps.stock.serializers import LigneInventaireSerializer
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets

from .inventaire_session import InventaireSessionViewSet


class LigneInventaireViewSet(viewsets.ModelViewSet):
    queryset = LigneInventaire.objects.all().select_related("session", "article")
    serializer_class = LigneInventaireSerializer
    permission_classes = InventaireSessionViewSet.permission_classes
    filter_backends = [DjangoFilterBackend]  # noqa: RUF012
    filterset_fields = ["session", "article"]  # noqa: RUF012
