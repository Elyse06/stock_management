from apps.catalogue.models import Article
from apps.catalogue.services.stock_filters import build_stock_filters
from apps.dashboard.utlis import custom_paginate
from django.db.models import Q, Sum
from django.db.models.functions import Coalesce
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class DashboardArticlesView(APIView):
    permission_classes = [IsAuthenticated]  # noqa: RUF012

    def get(self, request):
        search = request.query_params.get("search", "")
        categorie = request.query_params.get("categorie", "")
        mode_suivi = request.query_params.get("mode_suivi", "")

        stock_filters = build_stock_filters(relation_prefix="details_mouvement__")

        queryset = Article.objects.select_related("categorie", "marque").annotate(
            stock_calcule=(
                Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["entree"]), 0)
                - Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["sortie"]), 0)
                + Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["ajustement_plus"]), 0)
                - Coalesce(Sum("details_mouvement__quantite", filter=stock_filters["ajustement_moins"]), 0)
            )
        )

        if search:
            queryset = queryset.filter(Q(code_article__icontains=search) | Q(designation__icontains=search))
        if categorie:
            queryset = queryset.filter(categorie_id=categorie)
        if mode_suivi:
            queryset = queryset.filter(mode_suivi=mode_suivi)

        queryset = queryset.order_by("-stock_calcule")
        paginated = custom_paginate(queryset, request)

        data = [
            {
                "code_article": a.code_article,
                "designation": a.designation,
                "categorie_nom": a.categorie.cat_libelle if a.categorie else None,
                "marque_libelle": a.marque.mq_libelle if a.marque else None,
                "stock_calcule": a.stock_calcule,
                "seuil": a.seuil,
                "mode_suivi": a.mode_suivi,
            }
            for a in paginated["results"]
        ]

        return Response({
            "count": paginated["count"],
            "next": paginated["next"],
            "previous": paginated["previous"],
            "results": data,
        })
