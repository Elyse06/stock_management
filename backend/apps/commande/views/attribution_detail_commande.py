from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets

from apps.commande.models import AttributionDetailCommande
from apps.commande.serializers import AttributionDetailCommandeSerializer
from apps.common.permissions import (
    HasAction,
)


class AttributionDetailCommandeViewSet(viewsets.ModelViewSet):
    queryset = AttributionDetailCommande.objects.select_related(
        'affectation', 'affectation__employe', 'affectation__direction',
        'affectation__salle', 'affectation__site', 'detail_commande',
    ).all()
    serializer_class = AttributionDetailCommandeSerializer

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [HasAction.for_actions("COM_DEM", "COM_VAL")()]
        return [HasAction.for_actions("COM_DEM")()]

    filter_backends = [DjangoFilterBackend]  # noqa: RUF012
    filterset_fields = ["detail_commande", "affectation__employe"]  # noqa: RUF012