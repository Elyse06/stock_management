from datetime import datetime, time

from django.db.models import Q, Sum
from django.db.models.functions import Coalesce
from django.utils.dateparse import parse_date
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST, HTTP_404_NOT_FOUND
from rest_framework.views import APIView

from apps.catalogue.models import Article
from apps.catalogue.services.stock_filters import build_stock_filters
from apps.employee.models import Direction, Site
from apps.stock.models import DetailMouvement, Magasin, Mouvement, Salle


class HistoriqueLocalisationView(APIView):
    permission_classes = [IsAuthenticated]  # noqa: RUF012
    
    def get(self, request):
        magasin_id = request.query_params.get("magasin_id")
        direction_id = request.query_params.get("direction_id")
        site_id = request.query_params.get("site_id")
        salle_id = request.query_params.get("salle_id")
        date_reference = request.query_params.get("date")
        
        if not date_reference:
            return Response(
                {"error": "Le paramètre 'date' est obligatoire."},
                status=HTTP_400_BAD_REQUEST
            )
        if parse_date(date_reference) is None:
            return Response(
                {"error": "Le paramètre 'date' doit être au format AAAA-MM-JJ."},
                status=HTTP_400_BAD_REQUEST
            )
        
        if sum(bool(value) for value in (magasin_id, direction_id, site_id, salle_id)) != 1:
            return Response(
                {"error": "Sélectionnez un magasin, une direction, un site ou une salle."},
                status=HTTP_400_BAD_REQUEST
            )

        magasin = None
        direction = None
        site = None
        salle = None
        if magasin_id:
            try:
                magasin = Magasin.objects.get(magasin_id=magasin_id)
            except Magasin.DoesNotExist:
                return Response({"error": "Magasin non trouvé."}, status=HTTP_404_NOT_FOUND)
        elif direction_id:
            try:
                direction = Direction.objects.get(pk=direction_id)
            except Direction.DoesNotExist:
                return Response({"error": "Direction non trouvée."}, status=HTTP_404_NOT_FOUND)
        elif site_id:
            try:
                site = Site.objects.get(pk=site_id)
            except Site.DoesNotExist:
                return Response({"error": "Site non trouvé."}, status=HTTP_404_NOT_FOUND)
        else:
            try:
                salle = Salle.objects.get(pk=salle_id)
            except Salle.DoesNotExist:
                return Response({"error": "Salle non trouvée."}, status=HTTP_404_NOT_FOUND)
        
        articles = Article.objects.all()
        stocks = []
        
        for article in articles:
            stock = self._calculer_stock_a_date(
                article,
                magasin=magasin,
                direction=direction,
                site=site,
                salle=salle,
                date_reference=date_reference
            )
            
            if stock > 0:
                stocks.append({
                    "article_code": article.code_article,
                    "article_designation": article.designation,
                    "stock": stock,
                })
        
        return Response(stocks)
    
    def _calculer_stock_a_date(
        self, article, magasin=None, direction=None, site=None, salle=None,
        date_reference=None,
    ):
        date_ref = timezone.make_aware(
            datetime.combine(
                datetime.strptime(date_reference, "%Y-%m-%d").date(),
                time.max,
            )
        )
        if direction:
            beneficiaires_direction = (
                Q(affectation__direction_id=direction.pk)
                | Q(affectation__employe__emp_serv_id__serv_dir_id=direction.pk)
            )
            return self._calculer_stock_beneficiaire(article, beneficiaires_direction, date_ref)
        if site:
            # NOTE : la requête précédente utilisait
            # 'employe_beneficiaire__emp_site_id', qui n'a jamais existé en
            # tant que champ réel ('site' est une @property Python sur
            # Employer, pas une colonne) — cette branche aurait levé une
            # FieldError si jamais elle avait été exercée. Corrigé ici en
            # suivant la vraie chaîne de FK (emp_serv_id -> serv_dir_id ->
            # site). On y ajoute aussi la Salle (nouveau type), qui
            # appartient toujours à un site.
            beneficiaires_site = (
                Q(affectation__site_id=site.pk)
                | Q(affectation__direction__site_id=site.pk)
                | Q(affectation__employe__emp_serv_id__serv_dir_id__site_id=site.pk)
                | Q(affectation__salle__localite_id=site.pk)
            )
            return self._calculer_stock_beneficiaire(article, beneficiaires_site, date_ref)
        if salle:
            beneficiaires_salle = Q(affectation__salle_id=salle.pk)
            return self._calculer_stock_beneficiaire(article, beneficiaires_salle, date_ref)

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

    def _calculer_stock_beneficiaire(self, article, beneficiaires, date_reference):
        filtres = {
            "article": article,
            "mouvement__date__lte": date_reference,
        }
        sorties = DetailMouvement.objects.filter(
            beneficiaires, mouvement__type_mouvement=Mouvement.Type.SORTIE, **filtres
        ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
        retours = DetailMouvement.objects.filter(
            beneficiaires, mouvement__type_mouvement=Mouvement.Type.RETOUR, **filtres
        ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
        ajustements_positifs = DetailMouvement.objects.filter(
            beneficiaires,
            mouvement__type_mouvement=Mouvement.Type.AJUSTEMENT,
            mouvement__motif="Régularisation d'écart positif",
            **filtres,
        ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
        ajustements_negatifs = DetailMouvement.objects.filter(
            beneficiaires,
            mouvement__type_mouvement=Mouvement.Type.AJUSTEMENT,
            mouvement__motif="Régularisation d'écart négatif",
            **filtres,
        ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]
        return sorties - retours + ajustements_positifs - ajustements_negatifs