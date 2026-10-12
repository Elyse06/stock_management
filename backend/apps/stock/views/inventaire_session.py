from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.common import actions
from apps.common.permissions import HasAction
from apps.stock.models import InventaireSession
from apps.stock.serializers import InventaireSessionSerializer
from apps.stock.services import valider_session_inventaire

from .permissions import InventairePermission


class InventaireSessionViewSet(viewsets.ModelViewSet):
    serializer_class = InventaireSessionSerializer
    permission_classes = [InventairePermission]  # noqa: RUF012
    filter_backends = [DjangoFilterBackend]  # noqa: RUF012
    filterset_fields = ["statut", "magasin", "direction", "site", "salle"]  # noqa: RUF012

    def get_queryset(self):
        queryset = (
            InventaireSession.objects.select_related("magasin", "direction", "site", "salle")
            .prefetch_related("lignes__article")
            .order_by("pk")
        )
        service_id = self.request.query_params.get("service")
        if service_id:
            queryset = queryset.filter(direction_id=service_id)
        return queryset

    @staticmethod
    def _verifier_modifiable(session):
        if session.statut != InventaireSession.Statut.EN_ATTENTE:
            raise ValidationError("Une session déjà validée ou rejetée n'est plus modifiable.")

    def perform_update(self, serializer):
        self._verifier_modifiable(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._verifier_modifiable(instance)
        instance.delete()

    @action(detail=True, methods=["post"], url_path="valider",
            permission_classes=[HasAction.for_actions(actions.INV_VAL)])
    def valider(self, request, pk=None):
        session = valider_session_inventaire(self.get_object())
        session = self.get_queryset().get(pk=session.pk)
        return Response(self.get_serializer(session).data)
