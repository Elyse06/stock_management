from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.permissions import HasAction

from .models import (
    DetailMouvement,
    InventaireSession,
    LigneInventaire,
    Magasin,
    Mouvement,
)
from .serializers import (
    DetailMouvementSerializer,
    InventaireSessionSerializer,
    LigneInventaireSerializer,
    MagasinSerializer,
    MouvementSerializer,
)
from .services import valider_session_inventaire


class MagasinViewSet(viewsets.ModelViewSet):
    queryset = Magasin.objects.all()
    serializer_class = MagasinSerializer
    permission_classes = [HasAction.for_actions("MAG_GERE")]


class MouvementViewSet(viewsets.ModelViewSet):
    queryset = (
        Mouvement.objects.all()
        .select_related("magasin_source", "magasin_destination")
        .prefetch_related("details__article", "details__employe_beneficiaire")
    )
    serializer_class = MouvementSerializer
    permission_classes = [HasAction.for_actions("MVT_GERE")]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["type_mouvement", "magasin_source", "magasin_destination"]


class DetailMouvementViewSet(viewsets.ModelViewSet):
    queryset = DetailMouvement.objects.all().select_related(
        "mouvement", "article", "employe_beneficiaire"
    )
    serializer_class = DetailMouvementSerializer
    permission_classes = [HasAction.for_actions("MVT_LIRE")]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["mouvement", "article", "employe_beneficiaire"]


class InventaireSessionViewSet(viewsets.ModelViewSet):
    queryset = (
        InventaireSession.objects.all()
        .select_related("magasin", "service")
        .prefetch_related("lignes__article")
    )
    serializer_class = InventaireSessionSerializer
    permission_classes = [HasAction.for_actions("INV_GERE")]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["statut", "magasin", "service"]

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[HasAction.for_actions("INV_VAL")],
    )
    def valider(self, request, pk=None):
        session = self.get_object()
        session_validee = valider_session_inventaire(session)
        serializer = self.get_serializer(session_validee)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LigneInventaireViewSet(viewsets.ModelViewSet):
    queryset = LigneInventaire.objects.all().select_related("session", "article")
    serializer_class = LigneInventaireSerializer
    permission_classes = [HasAction.for_actions("INV_GERE")]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["session", "article"]