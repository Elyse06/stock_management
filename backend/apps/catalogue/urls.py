from rest_framework.routers import DefaultRouter

from .views import (
    ArticleViewSet,
    CategorieViewSet,
    FournisseurViewSet,
)

router = DefaultRouter()
router.register("categories", CategorieViewSet, basename="categorie")
router.register("articles", ArticleViewSet, basename="article")
router.register("fournisseurs", FournisseurViewSet, basename="fournisseur")

urlpatterns = router.urls
