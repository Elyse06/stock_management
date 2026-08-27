from django.shortcuts import render
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets

from apps.common.permissions import HasAction

from .models import DetailMouvement, Inventaire, Magasin, Mouvement
from .serializers import (
    DetailMouvementSerializer,
    InventaireSerializer,
    MagasinSerializer,
    MouvementSerializer,
)


# Create your views here.
class MagasinViewSet(viewsets.ModelViewSet):
    queryset = Magasin.objects.all()
    serializer_class = MagasinSerializer
    permission_classes = [HasAction.for_actions("MAG_GERE")]


class MouvementViewSet(viewsets.ModelViewSet):
    queryset = Mouvement.objects.all().select_related(
        "magasin_source", "magasin_destination"
    ).prefetch_related("details__article")
    serializer_class = MouvementSerializer
    permission_classes = [HasAction.for_actions("MVT_GERE")]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["type_mouvement", "magasin_source", "magasin_destination"]


class DetailMouvementViewSet(viewsets.ModelViewSet):
    queryset = DetailMouvement.objects.all().select_related("mouvement", "article")
    serializer_class = DetailMouvementSerializer
    permission_classes = [HasAction.for_actions("MVT_DETA")]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["mouvement", "article"]


class InventaireViewSet(viewsets.ModelViewSet):
    queryset = Inventaire.objects.all().select_related("mouvement", "magasin")
    serializer_class = InventaireSerializer
    permission_classes = [HasAction.for_actions("INV_GERE")]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["mouvement", "magasin"]
