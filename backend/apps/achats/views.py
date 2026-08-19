from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.common.permissions import HasProfil, IsOwnerOrProfil
from .models import Commande, DetailCommande
from .serializers import (
    CommandeSerializer, DetailCommandeSerializer, CommandeTraitementSerializer,
)


# Create your views here.
class CommandeViewSet(viewsets.ModelViewSet):
    queryset = Commande.objects.all().select_related(
        "utilisateur_demandeur", "utilisateur_traitant"
    ).prefetch_related("details__article")
    serializer_class = CommandeSerializer
    permission_classes = [HasProfil, IsOwnerOrProfil]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["statut", "utilisateur_demandeur"]

    def get_queryset(self):
        # Un utilisateur non-agent/admin ne voit que ses propres demandes
        user = self.request.user
        qs = super().get_queryset()
        if user.profil and user.profil.nom in ("Administrateur", "Gestionnaire"):
            return qs
        return qs.filter(utilisateur_demandeur=user)

    @action(detail=True, methods=["post"], permission_classes=[HasProfil.for_profils("Administrateur", "Gestionnaire")])
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
    permission_classes = [HasProfil]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["commande", "article"]
