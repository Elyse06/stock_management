from rest_framework.routers import DefaultRouter

from .views import (
	DetailMouvementViewSet,
	InventaireSessionViewSet,
	MagasinViewSet,
	MouvementViewSet,
)

router = DefaultRouter()
router.register("magasins", MagasinViewSet, basename="magasin")
router.register("mouvements", MouvementViewSet, basename="mouvement")
router.register("details-mouvement", DetailMouvementViewSet, basename="detailmouvement")
router.register("inventaires", InventaireSessionViewSet, basename="inventaire")

urlpatterns = router.urls
