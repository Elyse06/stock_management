from django.db.models import Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets

from .models import Direction, Employer, Service, Site
from .serializers import (
    DirectionSerializer,
    EmployerSerializer,
    ServiceSerializer,
    SiteSerializer,
)


class SiteViewSet(viewsets.ModelViewSet):
    serializer_class = SiteSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["site_type"]
    search_fields = ["site_nom", "localite"]

    def get_queryset(self):
        return Site.objects.annotate(
            directions_count=Count("employees__emp_dir_id", distinct=True),
            employees_count=Count("employees", distinct=True),
        )

class DirectionViewSet(viewsets.ModelViewSet):
    serializer_class = DirectionSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["dir_libelle", "dir_description"]

    def get_queryset(self):
        return Direction.objects.annotate(
            services_count=Count("service", distinct=True),
            employees_count=Count("employees", distinct=True),
        )

class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["serv_dir_id"]
    search_fields = ["serv_libelle", "serv_info", "serv_dir_id__dir_libelle"]

    def get_queryset(self):
        return Service.objects.annotate(
            employees_count=Count("employer", distinct=True),
        )

class EmployerViewSet(viewsets.ModelViewSet):
    queryset = Employer.objects.all()
    serializer_class = EmployerSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["emp_site_id", "emp_dir_id", "emp_serv_id"]
    search_fields = ["emp_nom", "emp_matricule", "emp_fonction"]