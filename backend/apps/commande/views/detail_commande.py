from apps.commande.models import DetailCommande
from apps.commande.serializers import DetailCommandeSerializer
from apps.common.permissions import (
    HasAction,
)
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets


class DetailCommandeViewSet(viewsets.ModelViewSet):
    queryset = DetailCommande.objects.all().select_related("article", "commande")
    serializer_class = DetailCommandeSerializer

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [HasAction.for_actions("COM_DEM", "COM_VAL")()]
        return [HasAction.for_actions("COM_DEM")()]

    filter_backends = [DjangoFilterBackend]  # noqa: RUF012
    filterset_fields = ["commande", "article"]  # noqa: RUF012
