from django.shortcuts import render
from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend

from apps.common.permissions import HasProfil
from .models import Magasin, Mouvement, DetailMouvement, Inventaire
from .serializers import (
    MagasinSerializer, MouvementSerializer,
    DetailMouvementSerializer, InventaireSerializer,
)

# Create your views here.
class MagasinViewSet(viewsets.ModelViewSet):
    queryset = Magasin.objects.all()
    serializer_class = MagasinSerializer
    permission_classes = [HasProfil.for_profils("Administrateur", "Magasinier", "Gestionnaire")]


class MouvementViewSet(viewsets.ModelViewSet):
    queryset = Mouvement.objects.all().select_related(
        "magasin_source", "magasin_destination"
    ).prefetch_related("details__article")
    serializer_class = MouvementSerializer
    permission_classes = [HasProfil.for_profils("Administrateur", "Magasinier", "Gestionnaire")]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["type", "magasin_source", "magasin_destination"]


class DetailMouvementViewSet(viewsets.ModelViewSet):
    queryset = DetailMouvement.objects.all().select_related("mouvement", "article")
    serializer_class = DetailMouvementSerializer
    permission_classes = [HasProfil.for_profils("Administrateur", "Magasinier", "Gestionnaire")]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["mouvement", "article"]


class InventaireViewSet(viewsets.ModelViewSet):
    queryset = Inventaire.objects.all().select_related("mouvement", "magasin")
    serializer_class = InventaireSerializer
    permission_classes = [HasProfil.for_profils("Administrateur", "Magasinier", "Gestionnaire")]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["mouvement", "magasin"]
