from django.db import transaction
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalogue.models import Article
from apps.common import actions
from apps.common.permissions import HasAction
from apps.stock.models import DetailMouvement, Magasin, Mouvement


class _TestAlerteSerializer(serializers.Serializer):
    code_article = serializers.PrimaryKeyRelatedField(queryset=Article.objects.all())
    magasin_id = serializers.PrimaryKeyRelatedField(queryset=Magasin.objects.all())
    quantite = serializers.IntegerField(min_value=1, max_value=1000, default=1)


class TestAlerteStockView(APIView):
    permission_classes = [HasAction.for_actions(actions.INV_GERE)]  # noqa: RUF012

    @transaction.atomic
    def post(self, request):
        serializer = _TestAlerteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        article = serializer.validated_data["code_article"]
        magasin = serializer.validated_data["magasin_id"]

        mouvement = Mouvement.objects.create(
            type_mouvement=Mouvement.Type.SORTIE, magasin_source=magasin,
            origine="Test alerte stock", motif="Test de notification",
        )
        DetailMouvement.objects.create(
            mouvement=mouvement, article=article, quantite=serializer.validated_data["quantite"],
        )
        return Response(
            {
                "message": f"Mouvement de sortie créé pour {article.designation} dans {magasin.magasin_nom}",
                "mouvement_id": mouvement.mouvement_id,
            },
            status=status.HTTP_201_CREATED,
        )
