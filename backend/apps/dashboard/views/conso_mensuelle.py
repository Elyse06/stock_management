from datetime import timedelta

from apps.stock.models import DetailMouvement
from django.db.models import Sum
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class ConsommationMensuelleView(APIView):
    permission_classes = [IsAuthenticated]  # noqa: RUF012

    def get(self, request):
        douze_mois_ago = timezone.now() - timedelta(days=365)

        consommation = (
            DetailMouvement.objects.filter(
                mouvement__type_mouvement="SORTIE",
                mouvement__date__gte=douze_mois_ago,
            )
            .annotate(mois=TruncMonth("mouvement__date"))
            .values("mois")
            .annotate(total_sorties=Coalesce(Sum("quantite"), 0))
            .order_by("mois")
        )

        resultats = [
            {
                "mois": item["mois"].strftime("%Y-%m"),
                "quantite_sortie": item["total_sorties"],
            }
            for item in consommation
        ]

        return Response(resultats)
