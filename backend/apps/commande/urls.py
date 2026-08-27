from rest_framework.routers import DefaultRouter

from .views import CommandeViewSet, DetailCommandeViewSet

router = DefaultRouter()
router.register("commandes", CommandeViewSet, basename="commande")
router.register("details-commande", DetailCommandeViewSet, basename="detailcommande")

urlpatterns = router.urls
