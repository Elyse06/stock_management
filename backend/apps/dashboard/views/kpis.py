"""Indicateurs clés et listes détaillées associées."""
from datetime import timedelta

from django.db.models import Case, F, IntegerField, Max, Q, Sum, Value, When
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalogue.models import Article
from apps.common.dates import plage_mois
from apps.common.pagination import paginer
from apps.common.stock import annoter_stock
from apps.stock.models import DetailMouvement, Mouvement

from .permissions import DashboardPermission

JOURS_DORMANT = 90
FILTRE_ENTREES = Q(mouvement__type_mouvement__in=(Mouvement.Type.ENTREE, Mouvement.Type.RETOUR))


def _total(queryset):
    return queryset.aggregate(total=Coalesce(Sum("quantite"), 0))["total"]


def _compter(condition):
    return Coalesce(Sum(Case(When(condition, then=Value(1)), default=Value(0), output_field=IntegerField())), 0)


class DashboardKPIsView(APIView):
    permission_classes = [DashboardPermission]  # noqa: RUF012

    def get(self, request):
        debut_mois, _, _ = plage_mois()
        # Total, ruptures et sous-seuil en une seule requête sur les stocks annotés.
        indicateurs = annoter_stock(Article.objects.all()).aggregate(
            total_articles=Coalesce(Sum(Value(1)), 0),
            total_stock=Coalesce(Sum("stock_calcule"), 0),
            produits_en_rupture=_compter(Q(stock_calcule=0)),
            produits_sous_seuil=_compter(Q(stock_calcule__lt=F("seuil"))),
        )
        return Response({
            **indicateurs,
            "entrees_du_mois": _total(DetailMouvement.objects.filter(FILTRE_ENTREES, mouvement__date__gte=debut_mois)),
            "sorties_du_mois": _total(DetailMouvement.objects.filter(
                mouvement__type_mouvement=Mouvement.Type.SORTIE, mouvement__date__gte=debut_mois
            )),
        })


def _reponse_paginee(paginated, data, **extra):
    return Response({
        "count": paginated["count"],
        "next": paginated["next"],
        "previous": paginated["previous"],
        **extra,
        "results": data,
    })


class DashboardArticlesView(APIView):
    permission_classes = [DashboardPermission]  # noqa: RUF012

    def get(self, request):
        params = request.query_params
        queryset = annoter_stock(Article.objects.select_related("categorie"))
        if params.get("search"):
            queryset = queryset.filter(
                Q(code_article__icontains=params["search"]) | Q(designation__icontains=params["search"])
            )
        if params.get("categorie"):
            queryset = queryset.filter(categorie_id=params["categorie"])
        if params.get("mode_suivi"):
            queryset = queryset.filter(mode_suivi=params["mode_suivi"])

        paginated = paginer(queryset.order_by("-stock_calcule", "code_article"), request)
        return _reponse_paginee(paginated, [
            {
                "code_article": a.code_article,
                "designation": a.designation,
                "categorie_nom": a.categorie.cat_libelle if a.categorie else None,
                "stock_calcule": a.stock_calcule,
                "seuil": a.seuil,
                "mode_suivi": a.mode_suivi,
            }
            for a in paginated["results"]
        ])


class DashboardRupturesView(APIView):
    permission_classes = [DashboardPermission]  # noqa: RUF012

    def get(self, request):
        queryset = (
            annoter_stock(Article.objects.select_related("categorie"))
            .annotate(dernier_mouvement=Max("details_mouvement__mouvement__date"))
            .filter(stock_calcule=0)
            .order_by("code_article")
        )
        paginated = paginer(queryset, request)
        limite_dormant = timezone.now() - timedelta(days=JOURS_DORMANT)
        return _reponse_paginee(paginated, [
            {
                "code_article": a.code_article,
                "designation": a.designation,
                "categorie_nom": a.categorie.cat_libelle if a.categorie else None,
                "seuil": a.seuil,
                "dernier_mouvement": a.dernier_mouvement,
                "est_dormant": a.dernier_mouvement is None or a.dernier_mouvement < limite_dormant,
            }
            for a in paginated["results"]
        ])


class DashboardSousSeuilView(APIView):
    permission_classes = [DashboardPermission]  # noqa: RUF012

    @staticmethod
    def _urgence(stock, seuil):
        if stock == 0:
            return "critique"
        return "urgent" if stock < seuil * 0.5 else "attention"

    def get(self, request):
        queryset = (
            annoter_stock(Article.objects.select_related("categorie"))
            .filter(stock_calcule__lt=F("seuil"), seuil__gt=0)
            .order_by("stock_calcule", "code_article")
        )
        paginated = paginer(queryset, request)
        return _reponse_paginee(paginated, [
            {
                "code_article": a.code_article,
                "designation": a.designation,
                "categorie_nom": a.categorie.cat_libelle if a.categorie else None,
                "stock_calcule": a.stock_calcule,
                "seuil": a.seuil,
                "quantite_suggeree": max(0, a.seuil * 2 - a.stock_calcule),
                "niveau_urgence": self._urgence(a.stock_calcule, a.seuil),
            }
            for a in paginated["results"]
        ])


class _MouvementsDuMoisView(APIView):
    permission_classes = [DashboardPermission]  # noqa: RUF012

    def filtre(self):
        raise NotImplementedError

    def ligne(self, detail):
        raise NotImplementedError

    def get(self, request):
        debut, fin, libelle = plage_mois(request.query_params.get("mois"))
        queryset = DetailMouvement.objects.filter(
            self.filtre(), mouvement__date__gte=debut, mouvement__date__lt=fin
        ).select_related(
            "article", "mouvement__magasin_source", "mouvement__magasin_destination",
            "affectation__employe", "affectation__direction", "affectation__salle", "affectation__site",
        )
        total = _total(queryset)
        paginated = paginer(queryset.order_by("-mouvement__date", "-pk"), request)
        return _reponse_paginee(
            paginated, [self.ligne(d) for d in paginated["results"]], total_quantite=total, mois=libelle,
        )

    @staticmethod
    def _commun(detail):
        mouvement = detail.mouvement
        return {
            "mouvement_id": mouvement.mouvement_id,
            "date": mouvement.date,
            "article_code": detail.article.code_article,
            "article_designation": detail.article.designation,
            "quantite": detail.quantite,
        }


class DashboardEntreesMoisView(_MouvementsDuMoisView):
    def filtre(self):
        return FILTRE_ENTREES

    def ligne(self, detail):
        destination = detail.mouvement.magasin_destination
        return {
            **self._commun(detail),
            "magasin_destination": destination.magasin_nom if destination else None,
            "origine": detail.mouvement.origine,
            "motif": detail.mouvement.motif,
        }


class DashboardSortiesMoisView(_MouvementsDuMoisView):
    def filtre(self):
        return Q(mouvement__type_mouvement=Mouvement.Type.SORTIE)

    def ligne(self, detail):
        source = detail.mouvement.magasin_source
        return {
            **self._commun(detail),
            "magasin_source": source.magasin_nom if source else None,
            "beneficiaire": detail.affectation.nom if detail.affectation_id else None,
            "origine": detail.mouvement.origine,
            "motif": detail.mouvement.motif,
        }
