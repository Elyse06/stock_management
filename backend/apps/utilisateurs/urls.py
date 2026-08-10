from rest_framework.routers import DefaultRouter

from .views import ProfilViewSet, EmployeViewSet, UtilisateurViewSet

router = DefaultRouter()
router.register("profils", ProfilViewSet, basename="profil")
router.register("employes", EmployeViewSet, basename="employe")
router.register("utilisateurs", UtilisateurViewSet, basename="utilisateur")

urlpatterns = router.urls
