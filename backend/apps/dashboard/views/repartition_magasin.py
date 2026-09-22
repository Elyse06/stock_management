from apps.catalogue.services.stock_filters import build_stock_filters
from apps.stock.models import DetailMouvement, Magasin
from django.db.models import Sum
from django.db.models.functions import Coalesce
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class RepartitionMagasinView(APIView):
    permission_classes = [IsAuthenticated]  # noqa: RUF012

    def get(self, request):
        magasins = Magasin.objects.all()
        resultats = []

        for magasin in magasins:
            stock_filters = build_stock_filters(magasin_id=magasin.pk)
            entrees = DetailMouvement.objects.filter(
                stock_filters["entree"],
            ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]

            sorties = DetailMouvement.objects.filter(
                stock_filters["sortie"],
            ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]

            ajustements_plus = DetailMouvement.objects.filter(
                stock_filters["ajustement_plus"],
            ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]

            ajustements_moins = DetailMouvement.objects.filter(
                stock_filters["ajustement_moins"],
            ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]

            stock = entrees - sorties + ajustements_plus - ajustements_moins

            if stock > 0:
                resultats.append({
                    "magasin": magasin.magasin_nom,
                    "stock": stock,
                })

        return Response(resultats)
