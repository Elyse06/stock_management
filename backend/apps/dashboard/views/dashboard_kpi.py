from apps.catalogue.models import Article
from apps.catalogue.services.stock_filters import build_stock_filters
from apps.stock.models import DetailMouvement
from django.db.models import F, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class DashboardKPIsView(APIView):
    permission_classes = [IsAuthenticated]  # noqa: RUF012

    def get(self, request):
        aujourd_hui = timezone.now()
        debut_mois = aujourd_hui.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        total_articles = Article.objects.count()

        stock_filters = build_stock_filters(relation_prefix="details_mouvement__")

        articles_with_stock = Article.objects.annotate(
            stock_calcule=(
                Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["entree"]), 0)
                - Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["sortie"]), 0)
                + Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["ajustement_plus"]), 0)
                - Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["ajustement_moins"]), 0)
            )
        )

        total_stock = articles_with_stock.aggregate(total=Sum("stock_calcule"))["total"] or 0
        produits_en_rupture = articles_with_stock.filter(stock_calcule=0).count()
        produits_sous_seuil = articles_with_stock.filter(stock_calcule__lt=F("seuil")).count()
        entrees_du_mois = DetailMouvement.objects.filter(
            mouvement__type_mouvement="ENTREE",
            mouvement__date__gte=debut_mois,
        ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
        sorties_du_mois = DetailMouvement.objects.filter(
            mouvement__type_mouvement="SORTIE",
            mouvement__date__gte=debut_mois,
        ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]

        return Response({
            "total_articles": total_articles,
            "total_stock": total_stock,
            "produits_en_rupture": produits_en_rupture,
            "produits_sous_seuil": produits_sous_seuil,
            "entrees_du_mois": entrees_du_mois,
            "sorties_du_mois": sorties_du_mois,
        })
