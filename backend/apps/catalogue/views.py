from django.shortcuts import render
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend

from apps.common.permissions import HasProfil
from .models import Categorie, Article, Fournisseur, ArticleFournisseur
from .serializers import (
    CategorieSerializer, ArticleSerializer,
    FournisseurSerializer, ArticleFournisseurSerializer,
)

# Create your views here.
class CategorieViewSet(viewsets.ModelViewSet):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer
    permission_classes = [HasProfil.for_profils("Administrateur", "Gestionnaire", "Magasinier")]


class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.all().select_related("categorie").prefetch_related(
        "fournisseurs_liaison__fournisseur"
    )
    serializer_class = ArticleSerializer
    permission_classes = [HasProfil.for_profils("Administrateur", "Magasinier", "Gestionnaire", "Demandeur", "Auditer")]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["categorie", "mode_suivi"]
    search_fields = ["code_article", "designation", "code_barre"]


class FournisseurViewSet(viewsets.ModelViewSet):
    queryset = Fournisseur.objects.all()
    serializer_class = FournisseurSerializer
    permission_classes = [HasProfil.for_profils("Administrateur", "Gestionnaire", "Magasinier")]
    filter_backends = [filters.SearchFilter]
    search_fields = ["nom"]


class ArticleFournisseurViewSet(viewsets.ModelViewSet):
    queryset = ArticleFournisseur.objects.all().select_related("article", "fournisseur")
    serializer_class = ArticleFournisseurSerializer
    permission_classes = [HasProfil.for_profils("Administrateur", "Gestionnaire", "Magasinier")]
