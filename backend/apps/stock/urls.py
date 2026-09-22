from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
	DetailMouvementViewSet,
	ImportImmobilisationsView,
	InventaireSessionViewSet,
	LigneInventaireViewSet,
	MagasinViewSet,
	MouvementViewSet,
	UniteArticleViewSet,
)

router = DefaultRouter()
router.register("magasins", MagasinViewSet, basename="magasin")
router.register("mouvements", MouvementViewSet, basename="mouvement")
router.register("details-mouvement", DetailMouvementViewSet, basename="detailmouvement")
router.register("unites-article", UniteArticleViewSet, basename="unite-article")
router.register("inventaires", InventaireSessionViewSet, basename="inventaire")
router.register("lignes-inventaire", LigneInventaireViewSet, basename="ligne-inventaire")

urlpatterns = router.urls + [
	path(
		"import-immobilisations/",
		ImportImmobilisationsView.as_view(),
		name="import-immobilisations",
	),
]
