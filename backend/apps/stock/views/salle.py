from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets

from apps.stock.models import Salle
from apps.stock.serializers import SalleSerializer

from .permissions import LieuPermission


class SalleViewSet(viewsets.ModelViewSet):
    queryset = Salle.objects.select_related("localite").order_by("pk")
    serializer_class = SalleSerializer
    permission_classes = [LieuPermission]  # noqa: RUF012
    filter_backends = [DjangoFilterBackend]  # noqa: RUF012
    filterset_fields = ["localite"]  # noqa: RUF012
