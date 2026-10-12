import re

from django.http import HttpResponse
from rest_framework.response import Response
from rest_framework.status import HTTP_404_NOT_FOUND
from rest_framework.views import APIView

from apps.catalogue.models import Article
from apps.historique.exports import export_fiche_article
from apps.historique.services import construire_historique, lire_filtres

from .permissions import HistoriquePermission

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


class HistoriqueArticleView(APIView):
    permission_classes = [HistoriquePermission]  # noqa: RUF012

    def get(self, request, code_article):
        article = Article.objects.filter(code_article=code_article).first()
        if article is None:
            return Response({"error": "Article non trouvé."}, status=HTTP_404_NOT_FOUND)
        historique, stock = construire_historique(article, **lire_filtres(request.query_params))
        return Response({
            "article": {"code_article": article.code_article, "designation": article.designation},
            "historique": historique,
            "stock_actuel": stock,
        })


class HistoriqueArticleExportView(APIView):
    permission_classes = [HistoriquePermission]  # noqa: RUF012

    def get(self, request, code_article):
        article = Article.objects.filter(code_article=code_article).first()
        if article is None:
            return Response({"error": "Article non trouvé."}, status=HTTP_404_NOT_FOUND)
        historique, _ = construire_historique(
            article, avec_beneficiaire=False, **lire_filtres(request.query_params)
        )
        nom_fichier = "fiche_article_{}.xlsx".format(re.sub(r"[^A-Za-z0-9_-]", "_", article.code_article))
        response = HttpResponse(export_fiche_article(article.code_article, historique), content_type=XLSX)
        response["Content-Disposition"] = f'attachment; filename="{nom_fichier}"'
        return response
