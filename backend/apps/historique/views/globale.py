from django.db.models import Q
from django.core.paginator import Paginator
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
        article_designation = request.query_params.get("article_designation")
        
        mouvements = Mouvement.objects.select_related(
            "magasin_source", "magasin_destination"
        ).prefetch_related(
            "details__article"
        ).order_by("-date")
        
        if date_debut:
            mouvements = mouvements.filter(date__gte=date_debut)
        if date_fin:
            mouvements = mouvements.filter(date__date__lte=date_fin)
        if magasin_id:
            mouvements = mouvements.filter(
                Q(magasin_source_id=magasin_id) | Q(magasin_destination_id=magasin_id)
            )
        if type_mouvement:
            mouvements = mouvements.filter(type_mouvement=type_mouvement)
        if article_designation:
            mouvements = mouvements.filter(
                details__article__designation__icontains=article_designation
            ).distinct()

        paginator = Paginator(mouvements, min(int(request.query_params.get("page_size", 25)), 100))
        page = paginator.get_page(request.query_params.get("page", 1))
        
        resultats = []
        for mouvement in page.object_list:
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
                "magasin_source_nom": mouvement.magasin_source.magasin_nom if mouvement.magasin_source else None,
                "magasin_destination": {
                    "magasin_id": mouvement.magasin_destination.magasin_id,
                    "magasin_nom": mouvement.magasin_destination.magasin_nom,
                } if mouvement.magasin_destination else None,
                "magasin_destination_nom": mouvement.magasin_destination.magasin_nom if mouvement.magasin_destination else None,
                "details": [
                    {
                        "article_code": detail.article.code_article,
                        "article_designation": detail.article.designation,
                        "quantite": detail.quantite,
                    }
                    for detail in mouvement.details.all()
                ],
            })
        
        return Response({
            "count": paginator.count,
            "next": None,
            "previous": None,
            "results": resultats,
        })
