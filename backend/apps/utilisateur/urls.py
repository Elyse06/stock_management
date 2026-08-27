from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ActionViewSet, AutoriserViewSet, UtilisateurViewSet

router = DefaultRouter()
router.register("utilisateurs", UtilisateurViewSet)
router.register("autorisations", AutoriserViewSet)
router.register(r'action', ActionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]