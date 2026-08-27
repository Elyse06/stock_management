from django.shortcuts import render
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.permissions import HasAction, IsOwnerOrProfil

from .models import Commande, DetailCommande
from .serializers import (
    CommandeSerializer,
    CommandeTraitementSerializer,
    DetailCommandeSerializer,
)


# Create your views here.
class CommandeViewSet(viewsets.ModelViewSet):
    queryset = Commande.objects.all().select_related(
        "employe_demandeur", "employe_traitant",
        "employe_demandeur__emp_serv_id", "employe_traitant__emp_serv_id"
    ).prefetch_related("details__article")
    serializer_class = CommandeSerializer
    permission_classes = [HasAction.for_actions("CMD_CREA"), IsOwnerOrProfil]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["statut", "employe_demandeur"]

    def get_queryset(self):
        qs = super().get_queryset()
        return qs

    @action(detail=True, methods=["post"], permission_classes=[HasAction.for_actions("CMD_TRAI")])
    def traiter(self, request, pk=None):
        """
        POST /api/achats/commandes/{id}/traiter/
        body: {"statut": "EN_COURS" | "VALIDEE" | "REJETEE", "commentaire_agent": "..."}
        """
        commande = self.get_object()
        serializer = CommandeTraitementSerializer(
            data=request.data, context={"commande": commande, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(CommandeSerializer(commande).data, status=status.HTTP_200_OK)


class DetailCommandeViewSet(viewsets.ModelViewSet):
    queryset = DetailCommande.objects.all().select_related("article", "commande")
    serializer_class = DetailCommandeSerializer
    permission_classes = [HasAction.for_actions("CMD_CREA")]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["commande", "article"]
