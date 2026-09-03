from django.db.models import IntegerField, Q, Sum, Value
from django.db.models.functions import Coalesce
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.catalogue.models import Article
from apps.common.permissions import HasAction, HasActionByMethod

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
    permission_classes = [
        HasActionByMethod.for_methods(
                    GET=("CAT_LIRE",),
                    HEAD=("CAT_LIRE",),
                    OPTIONS=("CAT_LIRE",),
                    **{"*": ("INV_GERE",)},
                )
    ]

    @action(
        detail=True,
        methods=["get"],
        permission_classes=[HasAction.for_actions("INV_LIRE")],
    )
    def stocks(self, request, pk=None):
        magasin = self.get_object()

        entrees = DetailMouvement.objects.filter(
            mouvement__type_mouvement__in=[Mouvement.Type.ENTREE, Mouvement.Type.TRANSFERT],
            mouvement__magasin_destination=magasin,
        ).values("article").annotate(total=Coalesce(Sum("quantite"), 0))

        sorties = DetailMouvement.objects.filter(
            mouvement__type_mouvement__in=[Mouvement.Type.SORTIE, Mouvement.Type.TRANSFERT],
            mouvement__magasin_source=magasin,
        ).values("article").annotate(total=Coalesce(Sum("quantite"), 0))

        ajustements_plus = DetailMouvement.objects.filter(
            mouvement__type_mouvement=Mouvement.Type.AJUSTEMENT,
            mouvement__magasin_destination=magasin,
            mouvement__magasin_source__isnull=True,
        ).values("article").annotate(total=Coalesce(Sum("quantite"), 0))

        ajustements_moins = DetailMouvement.objects.filter(
            mouvement__type_mouvement=Mouvement.Type.AJUSTEMENT,
            mouvement__magasin_source=magasin,
            mouvement__magasin_destination__isnull=True,
        ).values("article").annotate(total=Coalesce(Sum("quantite"), 0))

        entrees_dict = {e["article"]: e["total"] for e in entrees}

        sorties_dict = {s["article"]: s["total"] for s in sorties}

        ajust_plus_dict = {a["article"]: a["total"] for a in ajustements_plus}

        ajust_moins_dict = {a["article"]: a["total"] for a in ajustements_moins}

        all_article_ids = set(
            list(entrees_dict.keys()) +
            list(sorties_dict.keys()) +
            list(ajust_plus_dict.keys()) +
            list(ajust_moins_dict.keys())
        )

        stocks = {}
        for article in Article.objects.filter(code_article__in=all_article_ids):
            stock = (
                entrees_dict.get(article.code_article, 0) - 
                sorties_dict.get(article.code_article, 0) +
                ajust_plus_dict.get(article.code_article, 0) -
                ajust_moins_dict.get(article.code_article, 0)
            )
            stocks[article.code_article] = {
                "article_code": article.code_article,
                "article_designation": article.designation,
                "stock_theorique": stock,
            }

        return Response(stocks)


class MouvementViewSet(viewsets.ModelViewSet):
    queryset = (
        Mouvement.objects.all()
        .select_related("magasin_source", "magasin_destination")
        .prefetch_related("details__article", "details__employe_beneficiaire")
    )
    serializer_class = MouvementSerializer
    permission_classes = [
        HasActionByMethod.for_methods(
            GET=("MOV_LIRE",),
            HEAD=("MOV_LIRE",),
            OPTIONS=("MOV_LIRE",),
            **{"*": ("INV_GERE",)},
        )
    ]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["type_mouvement", "magasin_source", "magasin_destination"]


class DetailMouvementViewSet(viewsets.ModelViewSet):
    queryset = DetailMouvement.objects.all().select_related(
        "mouvement", "article", "employe_beneficiaire"
    )
    serializer_class = DetailMouvementSerializer
    permission_classes = [HasActionByMethod.for_methods(
        GET=("MOV_LIRE",),
        HEAD=("MOV_LIRE",),
        OPTIONS=("MOV_LIRE",),
        **{"*": ("INV_GERE",)},
    )]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["mouvement", "article", "employe_beneficiaire"]


class InventaireSessionViewSet(viewsets.ModelViewSet):
    queryset = (
        InventaireSession.objects.all()
        .select_related("magasin", "service")
        .prefetch_related("lignes__article")
    )
    serializer_class = InventaireSessionSerializer
    permission_classes = [HasActionByMethod.for_methods(
        GET=("INV_LIRE",),
        HEAD=("INV_LIRE",),
        OPTIONS=("INV_LIRE",),
        **{"*": ("INV_GERE",)},
    )]
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
    permission_classes = InventaireSessionViewSet.permission_classes
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["session", "article"]