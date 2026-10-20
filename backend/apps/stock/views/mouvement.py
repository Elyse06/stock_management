import django_filters
from django.db.models import Count, IntegerField, OuterRef, Subquery, Sum
from django.db.models.functions import Coalesce
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action

from apps.common.employees import get_request_employee
from apps.common.pdf import reponse_pdf
from apps.stock.fiche_mouvement_pdf import generer_document_mouvement, nom_fichier_mouvement
from apps.stock.models import DetailMouvement, Mouvement
from apps.stock.serializers import MouvementListSerializer, MouvementSerializer

from .detail_mouvement import PREFETCH_UNITES
from .permissions import MouvementPermission


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
    permission_classes = [MouvementPermission]  # noqa: RUF012
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]  # noqa: RUF012
    filterset_class = MouvementFilter
    ordering_fields = ["date", "mouvement_id"]  # noqa: RUF012
    ordering = ["-date", "-mouvement_id"]  # noqa: RUF012

    def get_queryset(self):
        base = Mouvement.objects.select_related("magasin_source", "magasin_destination")
        if self.action == "list":
            # Liste : uniquement deux totaux calculés en base, sans les détails.
            return base.annotate(
                nb_articles=_par_mouvement(Count("pk")),
                quantite_totale=_par_mouvement(Sum("quantite")),
            )
        return base.prefetch_related(
            "details__article",
            "details__fournisseur",
            "details__affectation__employe",
            "details__affectation__direction",
            "details__affectation__salle",
            "details__affectation__site",
            *(f"details__{chemin}" for chemin in PREFETCH_UNITES),
        )

    def get_serializer_class(self):
        return MouvementListSerializer if self.action == "list" else MouvementSerializer

    def perform_create(self, serializer):
        # Le gestionnaire qui saisit le mouvement en est le signataire dans la fiche PDF.
        serializer.save(realise_par=get_request_employee(self.request))

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        """Accusé de retour, accusé de transfert (retour + réception) ou fiche du mouvement."""
        mouvement = self.get_object()
        return reponse_pdf(generer_document_mouvement(mouvement), nom_fichier_mouvement(mouvement))
