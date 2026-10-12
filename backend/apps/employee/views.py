from django.db.models import Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets

from apps.common import actions
from apps.common.permissions import LectureAuthentifieeEcritureAction

from .models import Direction, Employer, Service, Site
from .serializers import (
    DirectionSerializer,
    EmployerSerializer,
    ServiceSerializer,
    SiteSerializer,
)

LectureLibreEcritureAdmin = LectureAuthentifieeEcritureAction.for_actions(actions.USR_GERE)


class SiteViewSet(viewsets.ModelViewSet):
    serializer_class = SiteSerializer
    permission_classes = [LectureLibreEcritureAdmin]  # noqa: RUF012
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]  # noqa: RUF012
    filterset_fields = ["site_type"]  # noqa: RUF012
    search_fields = ["site_nom", "localite"]  # noqa: RUF012

    def get_queryset(self):
        return Site.objects.annotate(
            directions_count=Count("employees__emp_dir_id", distinct=True),
            employees_count=Count("employees", distinct=True),
        ).order_by("pk")


class DirectionViewSet(viewsets.ModelViewSet):
    serializer_class = DirectionSerializer
    permission_classes = [LectureLibreEcritureAdmin]  # noqa: RUF012
    filter_backends = [filters.SearchFilter]  # noqa: RUF012
    search_fields = ["dir_libelle", "dir_description"]  # noqa: RUF012

    def get_queryset(self):
        return Direction.objects.annotate(
            services_count=Count("service", distinct=True),
            employees_count=Count("employees", distinct=True),
        ).order_by("pk")


class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceSerializer
    permission_classes = [LectureLibreEcritureAdmin]  # noqa: RUF012
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]  # noqa: RUF012
    filterset_fields = ["serv_dir_id"]  # noqa: RUF012
    search_fields = ["serv_libelle", "serv_info", "serv_dir_id__dir_libelle"]  # noqa: RUF012

    def get_queryset(self):
        return (
            Service.objects.select_related("serv_dir_id")
            .annotate(employees_count=Count("employer", distinct=True))
            .order_by("pk")
        )


class EmployerViewSet(viewsets.ModelViewSet):
    queryset = Employer.objects.select_related(
        "emp_serv_id", "emp_serv_id__serv_dir_id", "emp_dir_id", "emp_site_id"
    ).order_by("pk")
    serializer_class = EmployerSerializer
    permission_classes = [LectureLibreEcritureAdmin]  # noqa: RUF012
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]  # noqa: RUF012
    filterset_fields = ["emp_site_id", "emp_dir_id", "emp_serv_id"]  # noqa: RUF012
    search_fields = ["emp_nom", "emp_matricule", "emp_fonction"]  # noqa: RUF012
