from datetime import timedelta

from apps.catalogue.models import Article
from apps.catalogue.services.stock_filters import build_stock_filters
from apps.dashboard.utlis import custom_paginate
from django.db.models import Max, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class DashboardRupturesView(APIView):
    permission_classes = [IsAuthenticated]  # noqa: RUF012

    def get(self, request):
        stock_filters = build_stock_filters(relation_prefix="details_mouvement__")

        queryset = Article.objects.select_related("categorie").annotate(
            stock_calcule=(
                Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["entree"]), 0)
                - Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["sortie"]), 0)
                + Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["ajustement_plus"]), 0)
                - Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["ajustement_moins"]), 0)
            ),
            dernier_mouvement=Max("details_mouvement__mouvement__date")
        ).filter(stock_calcule=0)

        paginated = custom_paginate(queryset, request)

        data = [
            {
                "code_article": a.code_article,
                "designation": a.designation,
                "categorie_nom": a.categorie.cat_libelle if a.categorie else None,
                "seuil": a.seuil,
                "dernier_mouvement": a.dernier_mouvement,
                "est_dormant": (a.dernier_mouvement is None or a.dernier_mouvement < timezone.now() - timedelta(days=90)),
            }
            for a in paginated["results"]
        ]

        return Response({
            "count": paginated["count"],
            "next": paginated["next"],
            "previous": paginated["previous"],
            "results": data,
        })
