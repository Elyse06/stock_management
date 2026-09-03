from django.db.models import Q, Sum
from django.db.models.functions import Coalesce
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets

from apps.common.permissions import HasAction, HasActionByMethod

from .models import Article, ArticleFournisseur, Categorie, Fournisseur, Marque
from .serializers import (
    ArticleFournisseurSerializer,
    ArticleSerializer,
    CategorieSerializer,
    FournisseurSerializer,
    MarqueSerializer,
)


# Create your views here.
class CategorieViewSet(viewsets.ModelViewSet):
    queryset = Categorie.objects.all()
    serializer_class = CategorieSerializer
    permission_classes = [
        HasActionByMethod.for_methods(
            GET=("CAT_LIRE",),
            HEAD=("CAT_LIRE",),
            OPTIONS=("CAT_LIRE",),
            **{"*": ("CAT_GERE",)},
        )
    ]


class MarqueViewSet(viewsets.ModelViewSet):
    queryset = Marque.objects.all()
    serializer_class = MarqueSerializer
    permission_classes = CategorieViewSet.permission_classes


class ArticleViewSet(viewsets.ModelViewSet):
    queryset = (
        Article.objects.all()
        .select_related("categorie")
        .prefetch_related("fournisseurs_liaison__fournisseur")
    )
    serializer_class = ArticleSerializer
    permission_classes = CategorieViewSet.permission_classes
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["categorie", "mode_suivi"]
    search_fields = ["code_article", "designation", "code_barre"]

    def get_queryset(self):
        queryset = Article.objects.select_related("categorie").prefetch_related(
            "fournisseurs_liaison__fournisseur"
        )

        magasin_id = self.request.query_params.get("magasin_id")
        
        if magasin_id:
            filtre_entree = Q(
                details_mouvement__mouvement__magasin_destination_id=magasin_id,
                details_mouvement__mouvement__type_mouvement__in=["ENTREE", "TRANSFERT"],
            )
            filtre_sortie = Q(
                details_mouvement__mouvement__magasin_source_id=magasin_id,
                details_mouvement__mouvement__type_mouvement__in=["SORTIE", "TRANSFERT"],
            )
            filtre_ajustement_plus = Q(
                details_mouvement__mouvement__type_mouvement="AJUSTEMENT",
                details_mouvement__mouvement__magasin_destination_id=magasin_id,
                details_mouvement__mouvement__magasin_source__isnull=True,
            )
            filtre_ajustement_moins = Q(
                details_mouvement__mouvement__type_mouvement="AJUSTEMENT",
                details_mouvement__mouvement__magasin_source_id=magasin_id,
                details_mouvement__mouvement__magasin_destination__isnull=True,
            )
        else:
            filtre_entree = Q(
                details_mouvement__mouvement__type_mouvement__in=["ENTREE", "TRANSFERT"]
            )
            filtre_sortie = Q(
                details_mouvement__mouvement__type_mouvement__in=["SORTIE", "TRANSFERT"]
            )
            filtre_ajustement_plus = Q(
                details_mouvement__mouvement__type_mouvement="AJUSTEMENT",
                details_mouvement__mouvement__magasin_destination__isnull=False,
                details_mouvement__mouvement__magasin_source__isnull=True,
            )
            filtre_ajustement_moins = Q(
                details_mouvement__mouvement__type_mouvement="AJUSTEMENT",
                details_mouvement__mouvement__magasin_source__isnull=False,
                details_mouvement__mouvement__magasin_destination__isnull=True,
            )
        
        return queryset.annotate(
            stock_calcule=(
                Coalesce(Sum("details_mouvement__quantite", filter=filtre_entree), 0)
                - Coalesce(Sum("details_mouvement__quantite", filter=filtre_sortie), 0)
                + Coalesce(Sum("details_mouvement__quantite", filter=filtre_ajustement_plus), 0)
                - Coalesce(Sum("details_mouvement__quantite", filter=filtre_ajustement_moins), 0)
            )
        )
    

class FournisseurViewSet(viewsets.ModelViewSet):
    queryset = Fournisseur.objects.all()
    serializer_class = FournisseurSerializer
    permission_classes = CategorieViewSet.permission_classes
    filter_backends = [filters.SearchFilter]
    search_fields = ["nom"]


class ArticleFournisseurViewSet(viewsets.ModelViewSet):
    queryset = ArticleFournisseur.objects.all().select_related("article", "fournisseur")
    serializer_class = ArticleFournisseurSerializer
    permission_classes = CategorieViewSet.permission_classes
