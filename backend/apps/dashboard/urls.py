from django.urls import path

from .views import (
    ConsommationMensuelleView,
    DashboardKPIsView,
    EvolutionStockView,
    ProduitsDormantsView,
    RepartitionCategorieView,
    RepartitionMagasinView,
    TopConsommesView,
)

urlpatterns = [
    path("kpis/", DashboardKPIsView.as_view(), name="dashboard-kpis"),
    path("top-consommes/", TopConsommesView.as_view(), name="dashboard-top-consommes"),
    path("produits-dormants/", ProduitsDormantsView.as_view(), name="dashboard-produits-dormants"),
    path("evolution-stock/", EvolutionStockView.as_view(), name="dashboard-evolution-stock"),
    path("consommation-mensuelle/", ConsommationMensuelleView.as_view(), name="dashboard-consommation-mensuelle"),
    path("repartition-categorie/", RepartitionCategorieView.as_view(), name="dashboard-repartition-categorie"),
    path("repartition-magasin/", RepartitionMagasinView.as_view(), name="dashboard-repartition-magasin"),
]