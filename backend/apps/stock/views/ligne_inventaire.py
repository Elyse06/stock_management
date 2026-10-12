from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError

from apps.stock.models import InventaireSession, LigneInventaire
from apps.stock.serializers import LigneInventaireSerializer

from .permissions import InventairePermission


class LigneInventaireViewSet(viewsets.ModelViewSet):
    queryset = LigneInventaire.objects.select_related("session", "article").order_by("pk")
    serializer_class = LigneInventaireSerializer
    permission_classes = [InventairePermission]  # noqa: RUF012
    filter_backends = [DjangoFilterBackend]  # noqa: RUF012
    filterset_fields = ["session", "article"]  # noqa: RUF012

    @staticmethod
    def _verifier_session_modifiable(session):
        if session.statut != InventaireSession.Statut.EN_ATTENTE:
            raise ValidationError("Les lignes d'une session déjà validée ou rejetée ne sont plus modifiables.")

    def perform_create(self, serializer):
        self._verifier_session_modifiable(serializer.validated_data["session"])
        serializer.save()

    def perform_update(self, serializer):
        self._verifier_session_modifiable(serializer.instance.session)
        serializer.save()

    def perform_destroy(self, instance):
        self._verifier_session_modifiable(instance.session)
        instance.delete()
