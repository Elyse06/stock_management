from datetime import timedelta

from apps.stock.models import DetailMouvement
from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class TopConsommesView(APIView):
    permission_classes = [IsAuthenticated]  # noqa: RUF012

    def get(self, request):
        vingt_jours_ago = timezone.now() - timedelta(days=20)

        top_articles = (
            DetailMouvement.objects.filter(
                mouvement__type_mouvement="SORTIE",
                mouvement__date__gte=vingt_jours_ago,
            )
            .values("article__code_article", "article__designation")
            .annotate(total_consomme=Coalesce(Sum("quantite"), 0))
            .order_by("-total_consomme")[:10]
        )

        resultats = [
            {
                "article_code": item["article__code_article"],
                "designation": item["article__designation"],
                "quantite_consomme": item["total_consomme"],
            }
            for item in top_articles
        ]

        return Response(resultats)
