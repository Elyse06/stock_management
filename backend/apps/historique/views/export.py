from django.db.models import Q
from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_404_NOT_FOUND
from rest_framework.views import APIView

from apps.catalogue.models import Article
from apps.historique.exports import export_fiche_article_horizontal
from apps.stock.models import DetailMouvement, Mouvement


class HistoriqueArticleExportView(APIView):
    permission_classes = [IsAuthenticated]  # noqa: RUF012
    
    def get(self, request, code_article):
        magasin_id = request.query_params.get("magasin_id")
        date_debut = request.query_params.get("date_debut")
        date_fin = request.query_params.get("date_fin")
        
        try:
            article = Article.objects.get(code_article=code_article)
        except Article.DoesNotExist:
            return Response(
                {"error": "Article non trouvé."},
                status=HTTP_404_NOT_FOUND
            )
        
        mouvements = DetailMouvement.objects.filter(
            article=article
        ).select_related(
            "mouvement"
        ).order_by("mouvement__date")
        
        if magasin_id:
            mouvements = mouvements.filter(
                Q(mouvement__magasin_source_id=magasin_id) |
                Q(mouvement__magasin_destination_id=magasin_id)
            )
        
        if date_debut:
            mouvements = mouvements.filter(mouvement__date__gte=date_debut)
        if date_fin:
            mouvements = mouvements.filter(mouvement__date__lte=date_fin)
        
        historique = []
        stock_cumule = 0
        
        for detail in mouvements:
            mouvement = detail.mouvement
            quantite = detail.quantite
            impact = 0
            
            if mouvement.type_mouvement == Mouvement.Type.ENTREE:
                if not magasin_id or mouvement.magasin_destination_id == magasin_id:
                    stock_cumule += quantite
                    impact = quantite
            elif mouvement.type_mouvement == Mouvement.Type.SORTIE:
                if not magasin_id or mouvement.magasin_source_id == magasin_id:
                    stock_cumule -= quantite
                    impact = -quantite
            elif mouvement.type_mouvement == Mouvement.Type.TRANSFERT:
                if mouvement.magasin_destination_id == magasin_id:
                    stock_cumule += quantite
                    impact = quantite
                elif mouvement.magasin_source_id == magasin_id:
                    stock_cumule -= quantite
                    impact = -quantite
                else:
                    continue
            elif mouvement.type_mouvement == Mouvement.Type.AJUSTEMENT:
                if mouvement.magasin_destination_id == magasin_id and not mouvement.magasin_source_id:
                    stock_cumule += quantite
                    impact = quantite
                elif mouvement.magasin_source_id == magasin_id and not mouvement.magasin_destination_id:
                    stock_cumule -= quantite
                    impact = -quantite
                else:
                    continue
            
            historique.append({
                "date": mouvement.date,
                "type_mouvement": mouvement.type_mouvement,
                "magasin_source": mouvement.magasin_source.magasin_nom if mouvement.magasin_source else None,
                "magasin_destination": mouvement.magasin_destination.magasin_nom if mouvement.magasin_destination else None,
                "quantite": quantite,
                "impact": impact,
                "stock_cumule": stock_cumule,
                "origine": mouvement.origine,
                "motif": mouvement.motif,
            })
        
        filename = f"fiche_article_{code_article}.xlsx"
        filepath = export_fiche_article_horizontal(code_article, historique, filename)
        
        with open(filepath, "rb") as f:
            response = HttpResponse(
                f.read(),
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response
