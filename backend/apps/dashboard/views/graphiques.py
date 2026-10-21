"""Données des graphiques du tableau de bord."""
from datetime import date, timedelta

from django.db.models import Max, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalogue.models import Article
from apps.common.dates import debut_de_journee, derniers_mois
from apps.common.stock import annoter_stock, expression_stock, stocks_par_magasin
from apps.stock.models import DetailMouvement, Magasin, Mouvement

from .permissions import DashboardPermission

SORTIES = Q(mouvement__type_mouvement=Mouvement.Type.SORTIE)
# Entrées « réelles » : un transfert déplace du stock sans en ajouter.
ENTREES = Q(mouvement__type_mouvement__in=(Mouvement.Type.ENTREE, Mouvement.Type.RETOUR))


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
    """Stock total en fin de mois sur 12 mois, en UNE requête (auparavant 12)."""

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
    """Entrées et sorties des 12 derniers mois, mois sans mouvement inclus, en UNE requête.

    Auparavant : sorties seules, et les mois sans mouvement manquaient (courbe faussée).
    """

    permission_classes = [DashboardPermission]  # noqa: RUF012

    def get(self, request):
        mois = derniers_mois(12)
        debuts = [debut_de_journee(date(int(libelle[:4]), int(libelle[5:]), 1)) for libelle, _ in mois]

        def somme(condition, debut, fin):
            return Coalesce(Sum("quantite", filter=condition & Q(mouvement__date__gte=debut, mouvement__date__lt=fin)), 0)

        totaux = DetailMouvement.objects.aggregate(**{
            cle: somme(condition, debut, fin)
            for i, ((_, fin), debut) in enumerate(zip(mois, debuts, strict=True))
            for cle, condition in ((f"s{i}", SORTIES), (f"e{i}", ENTREES))
        })
        return Response([
            {"mois": libelle, "quantite_sortie": totaux[f"s{i}"], "quantite_entree": totaux[f"e{i}"]}
            for i, (libelle, _) in enumerate(mois)
        ])


class RepartitionCategorieView(APIView):
    permission_classes = [DashboardPermission]  # noqa: RUF012

    def get(self, request):
        categories = (
            annoter_stock(Article.objects.values("categorie__cat_libelle", "categorie__cat_description"), nom="stock_total")
            .filter(stock_total__gt=0)
            .order_by("-stock_total")
        )
        # « description » = famille complète (« Meuble du bureau ») ; « categorie » = code court (« MB »).
        return Response([
            {
                "categorie": ligne["categorie__cat_libelle"] or "Sans catégorie",
                "description": ligne["categorie__cat_description"] or "",
                "stock": ligne["stock_total"],
            }
            for ligne in categories
        ])


class RepartitionMagasinView(APIView):
    """Stock par magasin en 2 requêtes groupées (auparavant 4 par magasin)."""

    permission_classes = [DashboardPermission]  # noqa: RUF012

    def get(self, request):
        stocks = stocks_par_magasin()
        return Response([
            {"magasin": magasin.magasin_nom, "stock": stocks[magasin.pk]}
            for magasin in Magasin.objects.filter(pk__in=stocks).order_by("pk")
            if stocks[magasin.pk] > 0
        ])
