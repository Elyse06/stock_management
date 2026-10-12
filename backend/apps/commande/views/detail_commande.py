from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets

from apps.commande.access import (
    filtrer_commandes_visibles,
    verifier_commande_modifiable,
)
from apps.commande.models import DetailCommande
from apps.commande.serializers import DetailCommandeSerializer
from apps.commande.utils import QR_SELECT_RELATED

from .permissions import CommandePermission


class DetailCommandeViewSet(viewsets.ModelViewSet):
    serializer_class = DetailCommandeSerializer
    permission_classes = [CommandePermission]  # noqa: RUF012
    filter_backends = [DjangoFilterBackend]  # noqa: RUF012
    filterset_fields = ["commande", "article"]  # noqa: RUF012

    def get_queryset(self):
        queryset = (
            DetailCommande.objects.select_related("article", "commande")
            .prefetch_related(*(f"attributions__{chemin}" for chemin in QR_SELECT_RELATED))
            .order_by("pk")
        )
        return filtrer_commandes_visibles(queryset, self.request, chemin="commande__")

    def perform_update(self, serializer):
        verifier_commande_modifiable(serializer.instance.commande, self.request)
        serializer.save()

    def perform_destroy(self, instance):
        verifier_commande_modifiable(instance.commande, self.request)
        instance.delete()
