from apps.common.permissions import HasAction, HasActionByMethod
from apps.stock.models import InventaireSession
from apps.stock.serializers import (
    InventaireSessionSerializer,
    valider_session_inventaire,
)
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response


class InventaireSessionViewSet(viewsets.ModelViewSet):
    queryset = (
        InventaireSession.objects.all()
        .select_related("magasin", "direction")
        .prefetch_related("lignes__article")
    )
    serializer_class = InventaireSessionSerializer
    permission_classes = [HasActionByMethod.for_methods(  # noqa: RUF012
        GET=("INV_LIRE",),
        HEAD=("INV_LIRE",),
        OPTIONS=("INV_LIRE",),
        **{"*": ("INV_GERE",)},
    )]
    filter_backends = [DjangoFilterBackend]  # noqa: RUF012
    filterset_fields = ["statut", "magasin", "direction"]  # noqa: RUF012

    def get_queryset(self):
        qs = super().get_queryset()
        service_id = self.request.query_params.get('service')
        if service_id:
            qs = qs.filter(direction_id=service_id)
        return qs

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[HasAction.for_actions("INV_VAL")],
        url_path="valider"
    )
    def valider(self, request, pk=None):
        session = self.get_object()
        
        try:
            mouvement = valider_session_inventaire(session)  # noqa: F841
        except serializers.ValidationError as e:
            return Response({'detail': e.detail}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(session)
        return Response(serializer.data)
