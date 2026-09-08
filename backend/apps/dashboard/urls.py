from django.urls import path

from .views import (
    ConsommationMensuelleView,
    DashboardArticlesView,
    DashboardEntreesMoisView,
    DashboardKPIsView,
    DashboardRupturesView,
    DashboardSortiesMoisView,
    DashboardSousSeuilView,
    EvolutionStockView,
    ProduitsDormantsView,
    RepartitionCategorieView,
    RepartitionMagasinView,
    TopConsommesView,
)

urlpatterns = [
    path("kpis/", DashboardKPIsView.as_view(), name="dashboard-kpis"),
    path("kpis/articles/", DashboardArticlesView.as_view(), name="dashboard-kpis-articles"),
    path("kpis/ruptures/", DashboardRupturesView.as_view(), name="dashboard-kpis-ruptures"),
    path("kpis/sous-seuil/", DashboardSousSeuilView.as_view(), name="dashboard-kpis-sous-seuil"),
    path("kpis/entrees-mois/", DashboardEntreesMoisView.as_view(), name="dashboard-kpis-entrees-mois"),
    path("kpis/sorties-mois/", DashboardSortiesMoisView.as_view(), name="dashboard-kpis-sorties-mois"),
    path("top-consommes/", TopConsommesView.as_view(), name="dashboard-top-consommes"),
    path("produits-dormants/", ProduitsDormantsView.as_view(), name="dashboard-produits-dormants"),
    path("evolution-stock/", EvolutionStockView.as_view(), name="dashboard-evolution-stock"),
    path("consommation-mensuelle/", ConsommationMensuelleView.as_view(), name="dashboard-consommation-mensuelle"),
    path("repartition-categorie/", RepartitionCategorieView.as_view(), name="dashboard-repartition-categorie"),
    path("repartition-magasin/", RepartitionMagasinView.as_view(), name="dashboard-repartition-magasin"),
]