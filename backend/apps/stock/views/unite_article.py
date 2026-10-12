import django_filters
from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.localisation import filtre_direction, filtre_salle, filtre_site
from apps.stock.models import UniteArticle
from apps.stock.serializers import (
    RetourUniteSerializer,
    TransfertUniteSerializer,
    UniteArticleSerializer,
)

from .permissions import UnitePermission

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
            "article", "statut", "etat",
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
    ordering = ["-date_creation", "-unite_id"]  # noqa: RUF012

    def get_queryset(self):
        queryset = UniteArticle.objects.select_related(
            "article", "affectation__employe", "affectation__direction",
            "affectation__salle", "affectation__site",
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
