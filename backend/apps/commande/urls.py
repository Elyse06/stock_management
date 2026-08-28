from rest_framework.routers import DefaultRouter

from .views import (
    AttributionDetailCommandeViewSet,
    CommandeViewSet,
    DetailCommandeViewSet,
)

router = DefaultRouter()
router.register("commandes", CommandeViewSet, basename="commande")
router.register("details-commande", DetailCommandeViewSet, basename="detailcommande")
router.register("attribution-detail-commande", AttributionDetailCommandeViewSet, basename="attributiondetailcommande")

urlpatterns = router.urls
