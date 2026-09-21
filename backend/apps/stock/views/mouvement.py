from apps.common.permissions import HasActionByMethod
from apps.stock.models import Mouvement
from apps.stock.serializers import MouvementSerializer
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets


class MouvementViewSet(viewsets.ModelViewSet):
    queryset = (
        Mouvement.objects.all()
        .select_related("magasin_source", "magasin_destination")
        .prefetch_related("details__article", "details__employe_beneficiaire")
    )
    serializer_class = MouvementSerializer
    permission_classes = [  # noqa: RUF012
        HasActionByMethod.for_methods(
            GET=("MOV_LIRE",),
            HEAD=("MOV_LIRE",),
            OPTIONS=("MOV_LIRE",),
            **{"*": ("INV_GERE",)},
        )
    ]
    filter_backends = [DjangoFilterBackend]  # noqa: RUF012
    filterset_fields = ["type_mouvement", "magasin_source", "magasin_destination"]  # noqa: RUF012
