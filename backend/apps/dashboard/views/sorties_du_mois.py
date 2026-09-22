from datetime import datetime

from apps.dashboard.utlis import custom_paginate
from apps.stock.models import DetailMouvement
from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
    

class DashboardSortiesMoisView(APIView):
    permission_classes = [IsAuthenticated]  # noqa: RUF012

    def get(self, request):
        mois_selectionne = request.query_params.get("mois")
        
        if mois_selectionne:
            try:
                annee, mois = map(int, mois_selectionne.split("-"))
                debut_mois = timezone.make_aware(datetime(annee, mois, 1))  # noqa: DTZ001
                if mois == 12:
                    fin_mois = timezone.make_aware(datetime(annee + 1, 1, 1))  # noqa: DTZ001
                else:
                    fin_mois = timezone.make_aware(datetime(annee, mois + 1, 1))  # noqa: DTZ001
            except (ValueError, TypeError):
                return Response(
                    {"error": "Format de mois invalide. Utilisez YYYY-MM."},
                    status=400
                )
        else:
            maintenant = timezone.now()
            debut_mois = maintenant.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if maintenant.month == 12:
                fin_mois = maintenant.replace(year=maintenant.year + 1, month=1, day=1)
            else:
                fin_mois = maintenant.replace(month=maintenant.month + 1, day=1)

        queryset = DetailMouvement.objects.filter(
            mouvement__type_mouvement="SORTIE",
            mouvement__date__gte=debut_mois,
            mouvement__date__lt=fin_mois,
        ).select_related("article", "mouvement", "mouvement__magasin_source", "employe_beneficiaire")

        total = queryset.aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
        paginated = custom_paginate(queryset.order_by("-mouvement__date"), request)

        data = [
            {
                "mouvement_id": d.mouvement.mouvement_id,
                "date": d.mouvement.date,
                "article_code": d.article.code_article,
                "article_designation": d.article.designation,
                "quantite": d.quantite,
                "magasin_source": d.mouvement.magasin_source.magasin_nom if d.mouvement.magasin_source else None,
                "beneficiaire": d.employe_beneficiaire.emp_nom if d.employe_beneficiaire else None,
                "origine": d.mouvement.origine,
                "motif": d.mouvement.motif,
            }
            for d in paginated["results"]
        ]

        return Response({
            "count": paginated["count"],
            "next": paginated["next"],
            "previous": paginated["previous"],
            "total_quantite": total,
            "mois": mois_selectionne or debut_mois.strftime("%Y-%m"),
            "results": data,
        })
