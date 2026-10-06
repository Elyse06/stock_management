from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.permissions import HasActionByMethod
from apps.stock.models import UniteArticle
from apps.stock.serializers import (
    RetourUniteSerializer,
    TransfertUniteSerializer,
    UniteArticleSerializer,
)


class UniteArticleViewSet(viewsets.ModelViewSet):
    queryset = UniteArticle.objects.all().select_related(
        "article", "mouvement_entree", "mouvement_sortie",
        "affectation", "affectation__employe", "affectation__direction",
        "affectation__salle", "affectation__site",
    )
    serializer_class = UniteArticleSerializer
    permission_classes = [HasActionByMethod.for_methods(  # noqa: RUF012
        GET=("CAT_LIRE", "INV_LIRE"),
        HEAD=("CAT_LIRE", "INV_LIRE"),
        OPTIONS=("CAT_LIRE", "INV_LIRE"),
        **{"*": ("INV_GERE",)},
    )]
    filter_backends = [DjangoFilterBackend]  # noqa: RUF012
    filterset_fields = [  # noqa: RUF012
        "article",
        "statut",
        "etat",
        "affectation__employe",
        "affectation__direction",
        "affectation__salle",
        "affectation__site",
    ]

    def get_queryset(self):
        queryset = super().get_queryset()
        site_id = self.request.query_params.get("localisation_site_id")
        direction_id = self.request.query_params.get("localisation_direction_id")
        salle_id = self.request.query_params.get("localisation_salle_id")

        if site_id:
            queryset = queryset.filter(
                statut=UniteArticle.Statut.ATTRIBUE,
            ).filter(
                Q(affectation__site_id=site_id)
                | Q(affectation__employe__emp_site_id=site_id)
                | Q(affectation__salle__localite_id=site_id)
            )
        elif direction_id:
            queryset = queryset.filter(
                statut=UniteArticle.Statut.ATTRIBUE,
            ).filter(
                Q(affectation__direction_id=direction_id)
                | Q(affectation__employe__emp_serv_id__serv_dir_id=direction_id)
            )
        elif salle_id:
            queryset = queryset.filter(
                statut=UniteArticle.Statut.ATTRIBUE,
                affectation__salle_id=salle_id,
            )
        return queryset

    @action(detail=False, methods=["get"], url_path="resume-stock")
    def resume_stock(self, request):
        etats = UniteArticle.Etat
        resume = (
            UniteArticle.objects.filter(statut=UniteArticle.Statut.EN_STOCK)
            .values("article__code_article", "article__designation")
            .annotate(
                total=Count("unite_id"),
                bon=Count("unite_id", filter=Q(etat=etats.BON)),
                moyen=Count("unite_id", filter=Q(etat=etats.MOYEN)),
                mauvais=Count("unite_id", filter=Q(etat=etats.MAUVAIS)),
                hors_usage=Count("unite_id", filter=Q(etat=etats.HORS_USAGE)),
                perdu=Count("unite_id", filter=Q(etat=etats.PERDU)),
            )
            .order_by("article__designation", "article__code_article")
        )
        return Response([
            {
                "article_code": row["article__code_article"],
                "article_designation": row["article__designation"],
                "total": row["total"],
                "etats": {
                    "BON": row["bon"],
                    "MOYEN": row["moyen"],
                    "MAUVAIS": row["mauvais"],
                    "HORS_USAGE": row["hors_usage"],
                    "PERDU": row["perdu"],
                },
            }
            for row in resume
        ])

    @action(detail=True, methods=['post'], url_path='retourner-stock')
    def retourner_stock(self, request, pk=None):
        data = request.data.copy()
        data['unite_id'] = pk
        
        serializer = RetourUniteSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        try:
            mouvement = serializer.save()
        except Exception as e:  # noqa: BLE001
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'message': 'Unité retournée au stock avec succès.',
            'mouvement_id': mouvement.mouvement_id,
            'unite': UniteArticleSerializer(
                UniteArticle.objects.get(unite_id=pk)
            ).data,
        })
    
    @action(detail=True, methods=['post'], url_path='transferer')
    def transferer(self, request, pk=None):
        data = request.data.copy()
        data['unite_id'] = pk
        
        serializer = TransfertUniteSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        try:
            mouvements = serializer.save()
        except Exception as e:  # noqa: BLE001
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'message': 'Unité transférée avec succès.',
            'mouvement_retour_id': mouvements['retour'].mouvement_id,
            'mouvement_sortie_id': mouvements['sortie'].mouvement_id,
            'unite': UniteArticleSerializer(
                UniteArticle.objects.get(unite_id=pk)
            ).data,
        })