from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets

from apps.commande.access import (
    filtrer_commandes_visibles,
    verifier_commande_modifiable,
)
from apps.commande.models import AttributionDetailCommande
from apps.commande.serializers import AttributionDetailCommandeSerializer
from apps.commande.utils import QR_SELECT_RELATED

from .permissions import CommandePermission


class AttributionDetailCommandeViewSet(viewsets.ModelViewSet):
    serializer_class = AttributionDetailCommandeSerializer
    permission_classes = [CommandePermission]  # noqa: RUF012
    filter_backends = [DjangoFilterBackend]  # noqa: RUF012
    filterset_fields = [  # noqa: RUF012
        "detail_commande", "affectation__employe", "affectation__direction",
        "affectation__salle", "affectation__site",
    ]

    def get_queryset(self):
        queryset = AttributionDetailCommande.objects.select_related(
            "detail_commande__commande", *QR_SELECT_RELATED
        ).order_by("pk")
        return filtrer_commandes_visibles(queryset, self.request, chemin="detail_commande__commande__")

    def perform_update(self, serializer):
        verifier_commande_modifiable(serializer.instance.detail_commande.commande, self.request)
        serializer.save()

    def perform_destroy(self, instance):
        verifier_commande_modifiable(instance.detail_commande.commande, self.request)
        instance.delete()
