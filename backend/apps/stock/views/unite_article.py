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
        "article", "mouvement_entree", "mouvement_sortie", "employe_beneficiaire", "direction_beneficiaire"
    )
    serializer_class = UniteArticleSerializer
    permission_classes = [HasActionByMethod.for_methods(  # noqa: RUF012
        GET=("CAT_LIRE", "INV_LIRE"),
        HEAD=("CAT_LIRE", "INV_LIRE"),
        OPTIONS=("CAT_LIRE", "INV_LIRE"),
        **{"*": ("INV_GERE",)},
    )]
    filter_backends = [DjangoFilterBackend]  # noqa: RUF012
    filterset_fields = ["article", "statut", "etat", "employe_beneficiaire"]  # noqa: RUF012

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
