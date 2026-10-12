from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets

from apps.stock.models import DetailMouvement
from apps.stock.serializers import DetailMouvementSerializer

from .permissions import MouvementPermission

PREFETCH_UNITES = (
    "unites_creees__article", "unites_creees__affectation__employe",
    "unites_creees__affectation__direction", "unites_creees__affectation__salle",
    "unites_creees__affectation__site",
    "unites_attribuees__article", "unites_attribuees__affectation__employe",
    "unites_attribuees__affectation__direction", "unites_attribuees__affectation__salle",
    "unites_attribuees__affectation__site",
)


class DetailMouvementViewSet(viewsets.ModelViewSet):
    queryset = (
        DetailMouvement.objects.select_related(
            "affectation__employe", "affectation__direction",
            "affectation__salle", "affectation__site",
            "mouvement", "article", "fournisseur",
        )
        .prefetch_related(*PREFETCH_UNITES)
        .order_by("pk")
    )
    serializer_class = DetailMouvementSerializer
    permission_classes = [MouvementPermission]  # noqa: RUF012
    filter_backends = [DjangoFilterBackend]  # noqa: RUF012
    filterset_fields = [  # noqa: RUF012
        "mouvement", "article", "affectation",
        "affectation__employe", "affectation__direction",
        "affectation__salle", "affectation__site", "fournisseur",
    ]
