from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.stock.models import Mouvement


class HistoriqueGlobaleView(APIView):
    permission_classes = [IsAuthenticated]  # noqa: RUF012
    
    def get(self, request):
        date_debut = request.query_params.get("date_debut")
        date_fin = request.query_params.get("date_fin")
        magasin_id = request.query_params.get("magasin_id")
        type_mouvement = request.query_params.get("type_mouvement")
        article_code = request.query_params.get("article_code")
        
        mouvements = Mouvement.objects.select_related(
            "magasin_source", "magasin_destination"
        ).prefetch_related(
            "details__article"
        ).order_by("-date")
        
        if date_debut:
            mouvements = mouvements.filter(date__gte=date_debut)
        if date_fin:
            mouvements = mouvements.filter(date__lte=date_fin)
        if magasin_id:
            mouvements = mouvements.filter(
                Q(magasin_source_id=magasin_id) | Q(magasin_destination_id=magasin_id)
            )
        if type_mouvement:
            mouvements = mouvements.filter(type_mouvement=type_mouvement)
        if article_code:
            mouvements = mouvements.filter(details__article__code_article=article_code)
        
        resultats = []
        for mouvement in mouvements[:100]:
            resultats.append({
                "mouvement_id": mouvement.mouvement_id,
                "date": mouvement.date,
                "type_mouvement": mouvement.type_mouvement,
                "origine": mouvement.origine,
                "motif": mouvement.motif,
                "magasin_source": {
                    "magasin_id": mouvement.magasin_source.magasin_id,
                    "magasin_nom": mouvement.magasin_source.magasin_nom,
                } if mouvement.magasin_source else None,
                "magasin_destination": {
                    "magasin_id": mouvement.magasin_destination.magasin_id,
                    "magasin_nom": mouvement.magasin_destination.magasin_nom,
                } if mouvement.magasin_destination else None,
                "details": [
                    {
                        "article_code": detail.article.code_article,
                        "article_designation": detail.article.designation,
                        "quantite": detail.quantite,
                    }
                    for detail in mouvement.details.all()
                ],
            })
        
        return Response(resultats)
