from rest_framework.routers import DefaultRouter

from .views import ActionViewSet, AutoriserViewSet, UtilisateurViewSet

router = DefaultRouter()
router.register("utilisateurs", UtilisateurViewSet, basename="utilisateur")
router.register("autorisations", AutoriserViewSet, basename="autoriser")
router.register("action", ActionViewSet, basename="action")

urlpatterns = router.urls
