import django_filters
from django.db.models import Count, IntegerField, OuterRef, Subquery, Sum
from django.db.models.functions import Coalesce
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets

from apps.common.permissions import HasActionByMethod
from apps.stock.models import DetailMouvement, Mouvement
from apps.stock.serializers import MouvementListSerializer, MouvementSerializer


class MouvementFilter(django_filters.FilterSet):
    date_debut = django_filters.DateFilter(field_name="date", lookup_expr="date__gte")
    date_fin = django_filters.DateFilter(field_name="date", lookup_expr="date__lte")

    class Meta:
        model = Mouvement
        fields = ["type_mouvement", "magasin_source", "magasin_destination"]  # noqa: RUF012


def _par_mouvement(aggregat):
    return Coalesce(
        Subquery(
            DetailMouvement.objects.filter(mouvement=OuterRef("pk"))
            .order_by()
            .values("mouvement")
            .annotate(valeur=aggregat)
            .values("valeur"),
            output_field=IntegerField(),
        ),
        0,
    )


class MouvementViewSet(viewsets.ModelViewSet):
    queryset = Mouvement.objects.all()
    serializer_class = MouvementSerializer
    permission_classes = [  # noqa: RUF012
        HasActionByMethod.for_methods(
            GET=("MOV_LIRE",),
            HEAD=("MOV_LIRE",),
            OPTIONS=("MOV_LIRE",),
            **{"*": ("INV_GERE",)},
        )
    ]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]  # noqa: RUF012
    filterset_class = MouvementFilter
    ordering_fields = ["date", "mouvement_id"]  # noqa: RUF012
    ordering = ["-date", "-mouvement_id"]  # du plus récent au plus ancien  # noqa: RUF012

    def get_queryset(self):
        base = Mouvement.objects.select_related("magasin_source", "magasin_destination")

        if self.action == "list":
            # Liste : aucun détail, juste deux totaux calculés en base
            return base.annotate(
                nb_articles=_par_mouvement(Count("pk")),
                quantite_totale=_par_mouvement(Sum("quantite")),
            )

        # Détail / création / modification : tout est préchargé en une fois
        return base.prefetch_related(
            "details__article",
            "details__fournisseur",
            "details__affectation__employe",
            "details__affectation__direction",
            "details__affectation__salle",
            "details__affectation__site",
            "details__unites_creees",
            "details__unites_attribuees",
        )

    def get_serializer_class(self):
        if self.action == "list":
            return MouvementListSerializer
        return MouvementSerializer
