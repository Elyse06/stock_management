from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets

from apps.common.permissions import HasActionByMethod
from apps.stock.models import Salle
from apps.stock.serializers import SalleSerializer


class SalleViewSet(viewsets.ModelViewSet):
    queryset = Salle.objects.select_related("localite").all()
    serializer_class = SalleSerializer
    permission_classes = [HasActionByMethod.for_methods(  # noqa: RUF012
        GET=("CAT_LIRE",),
        HEAD=("CAT_LIRE",),
        OPTIONS=("CAT_LIRE",),
        **{"*": ("INV_GERE",)},
    )]
    filter_backends = [DjangoFilterBackend]  # noqa: RUF012
    filterset_fields = ["localite"]  # noqa: RUF012
