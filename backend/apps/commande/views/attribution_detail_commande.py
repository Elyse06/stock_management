from apps.commande.models import AttributionDetailCommande
from apps.commande.serializers import AttributionDetailCommandeSerializer
from apps.common.permissions import (
    HasAction,
)
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets


class AttributionDetailCommandeViewSet(viewsets.ModelViewSet):
    queryset = AttributionDetailCommande.objects.select_related(
        'employe_beneficiaire', 'direction_beneficiaire', 'detail_commande'
    ).all()
    serializer_class = AttributionDetailCommandeSerializer

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [HasAction.for_actions("COM_DEM", "COM_VAL")()]
        return [HasAction.for_actions("COM_DEM")()]

    filter_backends = [DjangoFilterBackend]  # noqa: RUF012
    filterset_fields = ["detail_commande", "employe_beneficiaire"]  # noqa: RUF012
