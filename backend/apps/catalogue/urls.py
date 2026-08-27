from rest_framework.routers import DefaultRouter

from .views import (
    ArticleFournisseurViewSet,
    ArticleViewSet,
    CategorieViewSet,
    FournisseurViewSet,
    MarqueViewSet,
)

router = DefaultRouter()
router.register("categories", CategorieViewSet, basename="categorie")
router.register("marque", MarqueViewSet, basename="marque")
router.register("articles", ArticleViewSet, basename="article")
router.register("fournisseurs", FournisseurViewSet, basename="fournisseur")
router.register("article-fournisseurs", ArticleFournisseurViewSet, basename="articlefournisseur")

urlpatterns = router.urls
