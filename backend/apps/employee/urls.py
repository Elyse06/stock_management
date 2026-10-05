from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DirectionViewSet, EmployerViewSet, ServiceViewSet, SiteViewSet
from .views_import import ImportEmployeesView

router = DefaultRouter()
router.register(r'sites', SiteViewSet)
router.register(r'employee', EmployerViewSet)
router.register(r'service', ServiceViewSet)
router.register(r'direction', DirectionViewSet)

urlpatterns = [
    path("employee/import/", ImportEmployeesView.as_view(), name="import-employees"),
    path('', include(router.urls)),
]