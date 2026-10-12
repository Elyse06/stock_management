from datetime import timedelta

from django.db.models import Max, Q, Sum
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalogue.models import Article
from apps.common.dates import derniers_mois
from apps.common.stock import annoter_stock, expression_stock, stocks_par_magasin
from apps.stock.models import DetailMouvement, Magasin, Mouvement

from .permissions import DashboardPermission

SORTIES = Q(mouvement__type_mouvement=Mouvement.Type.SORTIE)


class TopConsommesView(APIView):
    permission_classes = [DashboardPermission]  # noqa: RUF012

    def get(self, request):
        depuis = timezone.now() - timedelta(days=20)
        top = (
            DetailMouvement.objects.filter(SORTIES, mouvement__date__gte=depuis)
            .values("article__code_article", "article__designation")
            .annotate(total=Coalesce(Sum("quantite"), 0))
            .order_by("-total")[:10]
        )
        return Response([
            {
                "article_code": ligne["article__code_article"],
                "designation": ligne["article__designation"],
                "quantite_consomme": ligne["total"],
            }
            for ligne in top
        ])


class ProduitsDormantsView(APIView):
    permission_classes = [DashboardPermission]  # noqa: RUF012

    def get(self, request):
        limite = timezone.now() - timedelta(days=90)
        dormants = (
            Article.objects.annotate(dernier_mouvement=Max("details_mouvement__mouvement__date"))
            .filter(Q(dernier_mouvement__lt=limite) | Q(dernier_mouvement__isnull=True))
            .order_by("code_article")
            .values("code_article", "designation", "dernier_mouvement")[:50]
        )
        return Response([
            {
                "article_code": ligne["code_article"],
                "designation": ligne["designation"],
                "dernier_mouvement": ligne["dernier_mouvement"],
            }
            for ligne in dormants
        ])


class EvolutionStockView(APIView):
    permission_classes = [DashboardPermission]  # noqa: RUF012

    def get(self, request):
        mois = derniers_mois(12)
        totaux = DetailMouvement.objects.aggregate(**{
            f"m{i}": expression_stock(prefix="", date_max=fin) for i, (_, fin) in enumerate(mois)
        })
        return Response([
            {"mois": libelle, "stock_total": totaux[f"m{i}"] or 0}
            for i, (libelle, _) in enumerate(mois)
        ])


class ConsommationMensuelleView(APIView):
    permission_classes = [DashboardPermission]  # noqa: RUF012

    def get(self, request):
        depuis = timezone.now() - timedelta(days=365)
        consommation = (
            DetailMouvement.objects.filter(SORTIES, mouvement__date__gte=depuis)
            .annotate(mois=TruncMonth("mouvement__date"))
            .values("mois")
            .annotate(total=Coalesce(Sum("quantite"), 0))
            .order_by("mois")
        )
        return Response([
            {"mois": ligne["mois"].strftime("%Y-%m"), "quantite_sortie": ligne["total"]}
            for ligne in consommation
        ])


class RepartitionCategorieView(APIView):
    permission_classes = [DashboardPermission]  # noqa: RUF012

    def get(self, request):
        categories = (
            annoter_stock(Article.objects.values("categorie__cat_libelle"), nom="stock_total")
            .filter(stock_total__gt=0)
            .order_by("-stock_total")
        )
        return Response([
            {"categorie": ligne["categorie__cat_libelle"] or "Sans catégorie", "stock": ligne["stock_total"]}
            for ligne in categories
        ])


class RepartitionMagasinView(APIView):
    permission_classes = [DashboardPermission]  # noqa: RUF012

    def get(self, request):
        stocks = stocks_par_magasin()
        return Response([
            {"magasin": magasin.magasin_nom, "stock": stocks[magasin.pk]}
            for magasin in Magasin.objects.filter(pk__in=stocks).order_by("pk")
            if stocks[magasin.pk] > 0
        ])
