from datetime import datetime, time

from django.db.models import Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST, HTTP_404_NOT_FOUND
from rest_framework.views import APIView

from apps.catalogue.models import Article
from apps.catalogue.services.stock_filters import build_stock_filters
from apps.employee.models import Direction
from apps.stock.models import DetailMouvement, Magasin, Mouvement


class HistoriqueLocalisationView(APIView):
    permission_classes = [IsAuthenticated]  # noqa: RUF012
    
    def get(self, request):
        magasin_id = request.query_params.get("magasin_id")
        direction_id = request.query_params.get("direction_id")
        date_reference = request.query_params.get("date")
        
        if not date_reference:
            return Response(
                {"error": "Le paramètre 'date' est obligatoire."},
                status=HTTP_400_BAD_REQUEST
            )
        
        if bool(magasin_id) == bool(direction_id):
            return Response(
                {"error": "Sélectionnez un magasin ou une direction."},
                status=HTTP_400_BAD_REQUEST
            )

        magasin = None
        direction = None
        if magasin_id:
            try:
                magasin = Magasin.objects.get(magasin_id=magasin_id)
            except Magasin.DoesNotExist:
                return Response({"error": "Magasin non trouvé."}, status=HTTP_404_NOT_FOUND)
        else:
            try:
                direction = Direction.objects.get(pk=direction_id)
            except Direction.DoesNotExist:
                return Response({"error": "Direction non trouvée."}, status=HTTP_404_NOT_FOUND)
        
        articles = Article.objects.all()
        stocks = []
        
        for article in articles:
            stock = self._calculer_stock_a_date(
                article,
                magasin=magasin,
                direction=direction,
                date_reference=date_reference
            )
            
            if stock > 0:
                stocks.append({
                    "article_code": article.code_article,
                    "article_designation": article.designation,
                    "stock": stock,
                })
        
        return Response(stocks)
    
    def _calculer_stock_a_date(self, article, magasin=None, direction=None, date_reference=None):
        date_ref = timezone.make_aware(
            datetime.combine(
                datetime.strptime(date_reference, "%Y-%m-%d").date(),
                time.max,
            )
        )
        if direction:
            beneficiaires_direction = (
                Q(direction_beneficiaire_id=direction.pk)
                | Q(employe_beneficiaire__emp_serv_id__serv_dir_id=direction.pk)
            )
            date_filter = {"mouvement__date__lte": date_ref, "article": article}
            sorties = DetailMouvement.objects.filter(
                beneficiaires_direction,
                mouvement__type_mouvement=Mouvement.Type.SORTIE,
                **date_filter,
            ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
            retours = DetailMouvement.objects.filter(
                beneficiaires_direction,
                mouvement__type_mouvement=Mouvement.Type.RETOUR,
                **date_filter,
            ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
            return sorties - retours

        stock_filters = build_stock_filters(magasin_id=magasin.pk)
        date_filter = {"mouvement__date__lte": date_ref}
        
        entrees = DetailMouvement.objects.filter(
            stock_filters["entree"],
            **date_filter,
            article=article,
        ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
        
        sorties = DetailMouvement.objects.filter(
            stock_filters["sortie"],
            **date_filter,
            article=article,
        ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
        
        ajustements_plus = DetailMouvement.objects.filter(
            stock_filters["ajustement_plus"],
            **date_filter,
            article=article,
        ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
        
        ajustements_moins = DetailMouvement.objects.filter(
            stock_filters["ajustement_moins"],
            **date_filter,
            article=article,
        ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
        
        return entrees - sorties + ajustements_plus - ajustements_moins
