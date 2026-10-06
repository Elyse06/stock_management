from django.urls import include, path
from rest_framework.routers import DefaultRouter  # type: ignore

from .views import DirectionViewSet, EmployerViewSet, ServiceViewSet, SiteViewSet
from .views_import import ImportEmployeesView

router = DefaultRouter()
router.register(r'sites', SiteViewSet, basename='sites')
router.register(r'employee', EmployerViewSet, basename='employees')
router.register(r'service', ServiceViewSet, basename='services')
router.register(r'direction', DirectionViewSet, basename='directions')

urlpatterns = [
    path("employee/import/", ImportEmployeesView.as_view(), name="import-employees"),
    path('', include(router.urls)),
]