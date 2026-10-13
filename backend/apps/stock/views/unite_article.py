import django_filters
from django.db.models import Count, F, Q
from django.db.models.functions import Coalesce
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.localisation import filtre_direction, filtre_salle, filtre_site
from apps.common.pagination import paginer
from apps.stock.models import UniteArticle
from apps.stock.serializers import (
    RetourUniteSerializer,
    TransfertUniteSerializer,
    UniteArticleSerializer,
)

from .permissions import UnitePermission

# Type de bénéficiaire -> relation de l'Affectation qui doit être renseignée
CHAMP_PAR_TYPE = {"EMPLOYE": "employe", "DIRECTION": "direction", "SITE": "site", "SALLE": "salle"}


def _donnees_unite(request, pk):
    data = request.data.dict() if hasattr(request.data, "dict") else dict(request.data)
    data["unite_id"] = pk
    return data


class UniteArticleFilter(django_filters.FilterSet):
    beneficiaire_type = django_filters.CharFilter(method="filter_beneficiaire_type")

    class Meta:
        model = UniteArticle
        fields = [  # noqa: RUF012
            "article", "statut", "etat", "affectation",
            "affectation__employe", "affectation__direction",
            "affectation__salle", "affectation__site",
        ]

    def filter_beneficiaire_type(self, queryset, name, value):
        champ = CHAMP_PAR_TYPE.get((value or "").upper())
        if champ is None:
            return queryset.none()
        return queryset.filter(**{f"affectation__{champ}__isnull": False})


class UniteArticleViewSet(viewsets.ModelViewSet):
    serializer_class = UniteArticleSerializer
    permission_classes = [UnitePermission]  # noqa: RUF012
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]  # noqa: RUF012
    filterset_class = UniteArticleFilter
    search_fields = [  # noqa: RUF012
        "numero_de_serie", "article__designation", "article__code_article",
        "affectation__employe__emp_nom", "affectation__employe__emp_matricule",
        "affectation__direction__dir_libelle", "affectation__salle__nom",
        "affectation__site__site_nom",
    ]
    ordering_fields = ["date_creation", "numero_de_serie", "etat", "article__designation"]  # noqa: RUF012
    # unite_id départage les unités créées dans la même transaction -> pagination stable
    ordering = ["-date_creation", "-unite_id"]  # noqa: RUF012

    def get_queryset(self):
        queryset = UniteArticle.objects.select_related(
            "article__categorie", "affectation__employe__emp_site_id", "affectation__direction",
            "affectation__salle__localite", "affectation__site",
        )
        params = self.request.query_params if self.request else {}
        filtre = None
        if params.get("localisation_site_id"):
            filtre = filtre_site(params["localisation_site_id"])
        elif params.get("localisation_direction_id"):
            filtre = filtre_direction(params["localisation_direction_id"])
        elif params.get("localisation_salle_id"):
            filtre = filtre_salle(params["localisation_salle_id"])
        if filtre is not None:
            queryset = queryset.filter(filtre, statut=UniteArticle.Statut.ATTRIBUE)
        return queryset

    @action(detail=False, methods=["get"], url_path="par-beneficiaire")
    def par_beneficiaire(self, request):
        """Unités ATTRIBUÉES regroupées par bénéficiaire, avec leur nombre (liste paginée).

        Les filtres de la liste s'appliquent (recherche, type de bénéficiaire, état) :
        le nombre affiché correspond exactement au détail filtré par ``affectation``.
        """
        groupes = (
            self.filter_queryset(self.get_queryset())
            .filter(statut=UniteArticle.Statut.ATTRIBUE, affectation__isnull=False)
            .order_by()  # l'ordre par défaut (date) casserait le regroupement
            .values("affectation_id", "affectation__beneficiaire_type")
            .annotate(
                nb_unites=Count("unite_id"),
                nom=Coalesce(
                    "affectation__employe__emp_nom", "affectation__direction__dir_libelle",
                    "affectation__salle__nom", "affectation__site__site_nom",
                ),
                matricule=F("affectation__employe__emp_matricule"),
            )
            .order_by("nom", "affectation_id")
        )
        page = paginer(groupes, request)
        page["results"] = [
            {
                "affectation_id": g["affectation_id"],
                "beneficiaire_type": g["affectation__beneficiaire_type"],
                "beneficiaire_nom": g["nom"] or "—",
                "matricule": g["matricule"],
                "nb_unites": g["nb_unites"],
            }
            for g in page["results"]
        ]
        return Response(page)

    @action(detail=False, methods=["get"], url_path="resume-stock")
    def resume_stock(self, request):
        etats = UniteArticle.Etat
        resume = (
            UniteArticle.objects.filter(statut=UniteArticle.Statut.EN_STOCK)
            .values("article__code_article", "article__designation")
            .annotate(
                total=Count("unite_id"),
                **{
                    etat.lower(): Count("unite_id", filter=Q(etat=etat))
                    for etat in etats.values
                },
            )
            .order_by("article__designation", "article__code_article")
        )
        return Response([
            {
                "article_code": ligne["article__code_article"],
                "article_designation": ligne["article__designation"],
                "total": ligne["total"],
                "etats": {etat: ligne[etat.lower()] for etat in etats.values},
            }
            for ligne in resume
        ])

    def _reponse_unite(self, pk, **extra):
        unite = self.get_queryset().get(unite_id=pk)
        return Response({**extra, "unite": UniteArticleSerializer(unite).data})

    @action(detail=True, methods=["post"], url_path="retourner-stock")
    def retourner_stock(self, request, pk=None):
        serializer = RetourUniteSerializer(data=_donnees_unite(request, pk))
        serializer.is_valid(raise_exception=True)
        mouvement = serializer.save()
        return self._reponse_unite(
            pk, message="Unité retournée au stock avec succès.", mouvement_id=mouvement.mouvement_id,
        )

    @action(detail=True, methods=["post"], url_path="transferer")
    def transferer(self, request, pk=None):
        serializer = TransfertUniteSerializer(data=_donnees_unite(request, pk))
        serializer.is_valid(raise_exception=True)
        mouvements = serializer.save()
        return self._reponse_unite(
            pk,
            message="Unité transférée avec succès.",
            mouvement_retour_id=mouvements["retour"].mouvement_id,
            mouvement_sortie_id=mouvements["sortie"].mouvement_id,
        )
