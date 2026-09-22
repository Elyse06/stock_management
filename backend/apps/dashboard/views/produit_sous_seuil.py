from apps.catalogue.models import Article
from apps.catalogue.services.stock_filters import build_stock_filters
from apps.dashboard.utlis import custom_paginate
from django.db.models import F, Sum
from django.db.models.functions import Coalesce
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class DashboardSousSeuilView(APIView):
    permission_classes = [IsAuthenticated]  # noqa: RUF012

    def get(self, request):
        stock_filters = build_stock_filters(relation_prefix="details_mouvement__")

        queryset = Article.objects.select_related("categorie").annotate(
            stock_calcule=(
                Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["entree"]), 0)
                - Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["sortie"]), 0)
                + Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["ajustement_plus"]), 0)
                - Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["ajustement_moins"]), 0)
            )
        ).filter(stock_calcule__lt=F("seuil"), seuil__gt=0)

        queryset = queryset.order_by("stock_calcule")
        paginated = custom_paginate(queryset, request)

        data = []
        for a in paginated["results"]:
            quantite_suggeree = max(0, (a.seuil * 2) - a.stock_calcule)
            if a.stock_calcule == 0:
                niveau_urgence = "critique"
            elif a.stock_calcule < (a.seuil * 0.5):
                niveau_urgence = "urgent"
            else:
                niveau_urgence = "attention"
            
            data.append({
                "code_article": a.code_article,
                "designation": a.designation,
                "categorie_nom": a.categorie.cat_libelle if a.categorie else None,
                "stock_calcule": a.stock_calcule,
                "seuil": a.seuil,
                "quantite_suggeree": quantite_suggeree,
                "niveau_urgence": niveau_urgence,
            })

        return Response({
            "count": paginated["count"],
            "next": paginated["next"],
            "previous": paginated["previous"],
            "results": data,
        })
