from rest_framework.routers import DefaultRouter

from .views import MagasinViewSet, MouvementViewSet, DetailMouvementViewSet, InventaireViewSet

router = DefaultRouter()
router.register("magasins", MagasinViewSet, basename="magasin")
router.register("mouvements", MouvementViewSet, basename="mouvement")
router.register("details-mouvement", DetailMouvementViewSet, basename="detailmouvement")
router.register("inventaires", InventaireViewSet, basename="inventaire")

urlpatterns = router.urls
