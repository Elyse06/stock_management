from datetime import timedelta

from django.db.models import F, Max, Q, Sum
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalogue.models import Article
from apps.stock.models import DetailMouvement, Magasin


class DashboardKPIsView(APIView):
    """
    Retourne les 6 KPIs principaux du dashboard.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        aujourd_hui = timezone.now()
        debut_mois = aujourd_hui.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # 1. Total articles
        total_articles = Article.objects.count()

        # 2. Calculs de stock
        filtre_entree = Q(
            details_mouvement__mouvement__type_mouvement__in=["ENTREE", "TRANSFERT"]
        )
        filtre_sortie = Q(
            details_mouvement__mouvement__type_mouvement__in=["SORTIE", "TRANSFERT"]
        )
        filtre_ajustement_plus = Q(
            details_mouvement__mouvement__type_mouvement="AJUSTEMENT",
            details_mouvement__mouvement__magasin_destination__isnull=False,
            details_mouvement__mouvement__magasin_source__isnull=True,
        )
        filtre_ajustement_moins = Q(
            details_mouvement__mouvement__type_mouvement="AJUSTEMENT",
            details_mouvement__mouvement__magasin_source__isnull=False,
            details_mouvement__mouvement__magasin_destination__isnull=True,
        )

        # On annote d'abord le stock calculé pour chaque article
        articles_with_stock = Article.objects.annotate(
            stock_calcule=(
                Coalesce(Sum("details_mouvement__quantite", filter=filtre_entree), 0)
                - Coalesce(Sum("details_mouvement__quantite", filter=filtre_sortie), 0)
                + Coalesce(Sum("details_mouvement__quantite", filter=filtre_ajustement_plus), 0)
                - Coalesce(Sum("details_mouvement__quantite", filter=filtre_ajustement_moins), 0)
            )
        )

        # Puis on agrège les résultats
        total_stock = articles_with_stock.aggregate(total=Sum("stock_calcule"))["total"] or 0
        produits_en_rupture = articles_with_stock.filter(stock_calcule=0).count()
        
        # ✅ CORRECTION ICI : Utiliser F("seuil") au lieu de Q("seuil")
        produits_sous_seuil = articles_with_stock.filter(stock_calcule__lt=F("seuil")).count()

        # 3. Entrées du mois
        entrees_du_mois = DetailMouvement.objects.filter(
            mouvement__type_mouvement="ENTREE",
            mouvement__date__gte=debut_mois,
        ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]

        # 4. Sorties du mois
        sorties_du_mois = DetailMouvement.objects.filter(
            mouvement__type_mouvement="SORTIE",
            mouvement__date__gte=debut_mois,
        ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]

        return Response({
            "total_articles": total_articles,
            "total_stock": total_stock,
            "produits_en_rupture": produits_en_rupture,
            "produits_sous_seuil": produits_sous_seuil,
            "entrees_du_mois": entrees_du_mois,
            "sorties_du_mois": sorties_du_mois,
        })


class TopConsommesView(APIView):
    """
    Top 10 articles les plus consommés sur les 20 derniers jours.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vingt_jours_ago = timezone.now() - timedelta(days=20)

        top_articles = (
            DetailMouvement.objects.filter(
                mouvement__type_mouvement="SORTIE",
                mouvement__date__gte=vingt_jours_ago,
            )
            .values("article__code_article", "article__designation")
            .annotate(total_consomme=Coalesce(Sum("quantite"), 0))
            .order_by("-total_consomme")[:10]
        )

        resultats = [
            {
                "article_code": item["article__code_article"],
                "designation": item["article__designation"],
                "quantite_consomme": item["total_consomme"],
            }
            for item in top_articles
        ]

        return Response(resultats)


class ProduitsDormantsView(APIView):
    """
    Articles sans mouvement depuis 3 mois.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        trois_mois_ago = timezone.now() - timedelta(days=90)

        articles_dormants = (
            Article.objects.annotate(
                dernier_mouvement=Max("details_mouvement__mouvement__date")
            )
            .filter(
                Q(dernier_mouvement__lt=trois_mois_ago) | Q(dernier_mouvement__isnull=True)
            )
            .values("code_article", "designation", "dernier_mouvement")[:50]  # Limite à 50
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


class EvolutionStockView(APIView):
    """
    Évolution du stock total sur les 12 derniers mois.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        aujourd_hui = timezone.now()
        resultats = []

        # Pour chaque mois, calculer le stock à la fin du mois
        for i in range(11, -1, -1):
            mois_cible = aujourd_hui - timedelta(days=30 * i)
            fin_mois = mois_cible.replace(day=1) + timedelta(days=32)
            fin_mois = fin_mois.replace(day=1) - timedelta(days=1)
            fin_mois = fin_mois.replace(hour=23, minute=59, second=59)

            # Calculer le stock à cette date
            from django.db.models import Q as QFilter
            
            filtre_entree = QFilter(
                details_mouvement__mouvement__type_mouvement__in=["ENTREE", "TRANSFERT"],
                details_mouvement__mouvement__date__lte=fin_mois,
            )
            filtre_sortie = QFilter(
                details_mouvement__mouvement__type_mouvement__in=["SORTIE", "TRANSFERT"],
                details_mouvement__mouvement__date__lte=fin_mois,
            )
            filtre_ajustement_plus = QFilter(
                details_mouvement__mouvement__type_mouvement="AJUSTEMENT",
                details_mouvement__mouvement__magasin_destination__isnull=False,
                details_mouvement__mouvement__magasin_source__isnull=True,
                details_mouvement__mouvement__date__lte=fin_mois,
            )
            filtre_ajustement_moins = QFilter(
                details_mouvement__mouvement__type_mouvement="AJUSTEMENT",
                details_mouvement__mouvement__magasin_source__isnull=False,
                details_mouvement__mouvement__magasin_destination__isnull=True,
                details_mouvement__mouvement__date__lte=fin_mois,
            )

            total_stock = (
                Coalesce(Sum("details_mouvement__quantite", filter=filtre_entree), 0)
                - Coalesce(Sum("details_mouvement__quantite", filter=filtre_sortie), 0)
                + Coalesce(Sum("details_mouvement__quantite", filter=filtre_ajustement_plus), 0)
                - Coalesce(Sum("details_mouvement__quantite", filter=filtre_ajustement_moins), 0)
            )

            stock_mois = Article.objects.aggregate(stock_total=total_stock)["stock_total"]

            resultats.append({
                "mois": fin_mois.strftime("%Y-%m"),
                "stock_total": stock_mois,
            })

        return Response(resultats)


class ConsommationMensuelleView(APIView):
    """
    Sorties par mois sur les 12 derniers mois.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        douze_mois_ago = timezone.now() - timedelta(days=365)

        consommation = (
            DetailMouvement.objects.filter(
                mouvement__type_mouvement="SORTIE",
                mouvement__date__gte=douze_mois_ago,
            )
            .annotate(mois=TruncMonth("mouvement__date"))
            .values("mois")
            .annotate(total_sorties=Coalesce(Sum("quantite"), 0))
            .order_by("mois")
        )

        resultats = [
            {
                "mois": item["mois"].strftime("%Y-%m"),
                "quantite_sortie": item["total_sorties"],
            }
            for item in consommation
        ]

        return Response(resultats)


class RepartitionCategorieView(APIView):
    """
    Stock par catégorie.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Q as QFilter
        
        filtre_entree = QFilter(
            details_mouvement__mouvement__type_mouvement__in=["ENTREE", "TRANSFERT"]
        )
        filtre_sortie = QFilter(
            details_mouvement__mouvement__type_mouvement__in=["SORTIE", "TRANSFERT"]
        )
        filtre_ajustement_plus = QFilter(
            details_mouvement__mouvement__type_mouvement="AJUSTEMENT",
            details_mouvement__mouvement__magasin_destination__isnull=False,
            details_mouvement__mouvement__magasin_source__isnull=True,
        )
        filtre_ajustement_moins = QFilter(
            details_mouvement__mouvement__type_mouvement="AJUSTEMENT",
            details_mouvement__mouvement__magasin_source__isnull=False,
            details_mouvement__mouvement__magasin_destination__isnull=True,
        )

        categories = (
            Article.objects.values("categorie__cat_libelle")
            .annotate(
                stock_total=(
                    Coalesce(Sum("details_mouvement__quantite", filter=filtre_entree), 0)
                    - Coalesce(Sum("details_mouvement__quantite", filter=filtre_sortie), 0)
                    + Coalesce(Sum("details_mouvement__quantite", filter=filtre_ajustement_plus), 0)
                    - Coalesce(Sum("details_mouvement__quantite", filter=filtre_ajustement_moins), 0)
                )
            )
            .filter(stock_total__gt=0)
            .order_by("-stock_total")
        )

        resultats = [
            {
                "categorie": item["categorie__cat_libelle"] or "Sans catégorie",
                "stock": item["stock_total"],
            }
            for item in categories
        ]

        return Response(resultats)


class RepartitionMagasinView(APIView):
    """
    Stock par magasin.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        magasins = Magasin.objects.all()
        resultats = []

        for magasin in magasins:
            entrees = DetailMouvement.objects.filter(
                mouvement__type_mouvement__in=["ENTREE", "TRANSFERT"],
                mouvement__magasin_destination=magasin,
            ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]

            sorties = DetailMouvement.objects.filter(
                mouvement__type_mouvement__in=["SORTIE", "TRANSFERT"],
                mouvement__magasin_source=magasin,
            ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]

            ajustements_plus = DetailMouvement.objects.filter(
                mouvement__type_mouvement="AJUSTEMENT",
                mouvement__magasin_destination=magasin,
                mouvement__magasin_source__isnull=True,
            ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]

            ajustements_moins = DetailMouvement.objects.filter(
                mouvement__type_mouvement="AJUSTEMENT",
                mouvement__magasin_source=magasin,
                mouvement__magasin_destination__isnull=True,
            ).aggregate(total=Coalesce(Sum("quantite"), 0))["total"]

            stock = entrees - sorties + ajustements_plus - ajustements_moins

            if stock > 0:
                resultats.append({
                    "magasin": magasin.magasin_nom,
                    "stock": stock,
                })

        return Response(resultats)