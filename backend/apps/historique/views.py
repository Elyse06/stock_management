from datetime import datetime

from django.db.models import Q, Sum
from django.db.models.functions import Coalesce
from django.http import HttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST, HTTP_404_NOT_FOUND
from rest_framework.views import APIView

from apps.catalogue.models import Article
from apps.stock.models import DetailMouvement, Magasin, Mouvement

from .exports import export_fiche_article_horizontal


class HistoriqueGlobaleView(APIView):
    """
    Historique global des mouvements sur une période donnée.
    
    Filtres:
    - date_debut: Date de début (YYYY-MM-DD)
    - date_fin: Date de fin (YYYY-MM-DD)
    - magasin_id: ID du magasin (optionnel)
    - type_mouvement: Type de mouvement (ENTREE, SORTIE, TRANSFERT, AJUSTEMENT)
    - article_code: Code article (optionnel)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        date_debut = request.query_params.get("date_debut")
        date_fin = request.query_params.get("date_fin")
        magasin_id = request.query_params.get("magasin_id")
        type_mouvement = request.query_params.get("type_mouvement")
        article_code = request.query_params.get("article_code")
        
        # Queryset de base
        mouvements = Mouvement.objects.select_related(
            "magasin_source", "magasin_destination"
        ).prefetch_related(
            "details__article"
        ).order_by("-date")
        
        # Appliquer les filtres
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
        
        # Sérialisation manuelle
        resultats = []
        for mouvement in mouvements[:100]:  # Limite à 100 pour la performance
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


class HistoriqueLocalisationView(APIView):
    """
    Stock des articles dans un lieu à une date donnée.
    
    Filtres:
    - magasin_id: ID du magasin (obligatoire)
    - date: Date de référence (YYYY-MM-DD, obligatoire)
    
    Retourne uniquement les articles avec stock > 0.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        magasin_id = request.query_params.get("magasin_id")
        date_reference = request.query_params.get("date")
        
        # Validation
        if not date_reference:
            return Response(
                {"error": "Le paramètre 'date' est obligatoire."},
                status=HTTP_400_BAD_REQUEST
            )
        
        if not magasin_id:
            return Response(
                {"error": "Le paramètre 'magasin_id' est obligatoire."},
                status=HTTP_400_BAD_REQUEST
            )
        
        # Vérifier que le magasin existe
        try:
            magasin = Magasin.objects.get(magasin_id=magasin_id)
        except Magasin.DoesNotExist:
            return Response(
                {"error": "Magasin non trouvé."},
                status=HTTP_404_NOT_FOUND
            )
        
        # Calculer le stock pour chaque article à la date donnée
        articles = Article.objects.all()
        stocks = []
        
        for article in articles:
            stock = self._calculer_stock_a_date(
                article,
                magasin=magasin,
                date_reference=date_reference
            )
            
            if stock > 0:  # Uniquement les articles avec stock > 0
                stocks.append({
                    "article_code": article.code_article,
                    "article_designation": article.designation,
                    "stock": stock,
                })
        
        return Response(stocks)
    
    def _calculer_stock_a_date(self, article, magasin, date_reference):
        """Calcule le stock d'un article à une date donnée"""
        date_ref = datetime.strptime(date_reference, "%Y-%m-%d")
        
        # Entrées jusqu'à la date
        entrees = DetailMouvement.objects.filter(
            mouvement__type_mouvement__in=[Mouvement.Type.ENTREE, Mouvement.Type.TRANSFERT],
            mouvement__magasin_destination=magasin,
            mouvement__date__lte=date_ref,
            article=article,
        ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
        
        # Sorties jusqu'à la date
        sorties = DetailMouvement.objects.filter(
            mouvement__type_mouvement__in=[Mouvement.Type.SORTIE, Mouvement.Type.TRANSFERT],
            mouvement__magasin_source=magasin,
            mouvement__date__lte=date_ref,
            article=article,
        ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
        
        # Ajustements positifs jusqu'à la date
        ajustements_plus = DetailMouvement.objects.filter(
            mouvement__type_mouvement=Mouvement.Type.AJUSTEMENT,
            mouvement__magasin_destination=magasin,
            mouvement__magasin_source__isnull=True,
            mouvement__date__lte=date_ref,
            article=article,
        ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
        
        # Ajustements négatifs jusqu'à la date
        ajustements_moins = DetailMouvement.objects.filter(
            mouvement__type_mouvement=Mouvement.Type.AJUSTEMENT,
            mouvement__magasin_source=magasin,
            mouvement__magasin_destination__isnull=True,
            mouvement__date__lte=date_ref,
            article=article,
        ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
        
        return entrees - sorties + ajustements_plus - ajustements_moins


class HistoriqueArticleView(APIView):
    """
    Fiche de stock d'un article (historique des mouvements avec stock cumulé).
    
    Filtres:
    - magasin_id: ID du magasin (optionnel)
    - date_debut: Date de début (YYYY-MM-DD, optionnel)
    - date_fin: Date de fin (YYYY-MM-DD, optionnel)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, code_article):
        magasin_id = request.query_params.get("magasin_id")
        date_debut = request.query_params.get("date_debut")
        date_fin = request.query_params.get("date_fin")
        
        # Récupérer l'article
        try:
            article = Article.objects.get(code_article=code_article)
        except Article.DoesNotExist:
            return Response(
                {"error": "Article non trouvé."},
                status=HTTP_404_NOT_FOUND
            )
        
        # Récupérer tous les mouvements pour cet article
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
        
        # Construire l'historique avec stock cumulé
        historique = []
        stock_cumule = 0
        
        for detail in mouvements:
            mouvement = detail.mouvement
            quantite = detail.quantite
            
            # Calculer l'impact sur le stock
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
                    continue  # Pas concerné par ce magasin
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
        
        return Response({
            "article": {
                "code_article": article.code_article,
                "designation": article.designation,
            },
            "historique": historique,
            "stock_actuel": stock_cumule,
        })


class HistoriqueArticleExportView(APIView):
    """
    Export de la fiche article au format Excel (horizontal).
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, code_article):
        magasin_id = request.query_params.get("magasin_id")
        date_debut = request.query_params.get("date_debut")
        date_fin = request.query_params.get("date_fin")
        
        # Récupérer l'article
        try:
            article = Article.objects.get(code_article=code_article)
        except Article.DoesNotExist:
            return Response(
                {"error": "Article non trouvé."},
                status=HTTP_404_NOT_FOUND
            )
        
        # Récupérer les mouvements (même logique que HistoriqueArticleView)
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
        
        # Construire l'historique
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
        
        # Exporter en Excel
        filename = f"fiche_article_{code_article}.xlsx"
        filepath = export_fiche_article_horizontal(code_article, historique, filename)
        
        # Retourner le fichier
        with open(filepath, "rb") as f:
            response = HttpResponse(
                f.read(),
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response