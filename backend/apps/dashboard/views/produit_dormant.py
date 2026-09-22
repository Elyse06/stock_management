from datetime import timedelta

from apps.catalogue.models import Article
from django.db.models import Max, Q
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class ProduitsDormantsView(APIView):
    permission_classes = [IsAuthenticated]  # noqa: RUF012

    def get(self, request):
        trois_mois_ago = timezone.now() - timedelta(days=90)

        articles_dormants = (
            Article.objects.annotate(
                dernier_mouvement=Max("details_mouvement__mouvement__date")
            )
            .filter(
                Q(dernier_mouvement__lt=trois_mois_ago) | Q(dernier_mouvement__isnull=True)
            )
            .values("code_article", "designation", "dernier_mouvement")[:50]
        )

        resultats = [
            {
                "article_code": item["code_article"],
                "designation": item["designation"],
                "dernier_mouvement": item["dernier_mouvement"],
            }
            for item in articles_dormants
        ]

        return Response(resultats)
