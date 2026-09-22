from .articles import DashboardArticlesView
from .conso_mensuelle import ConsommationMensuelleView
from .dashboard_kpi import DashboardKPIsView
from .entrees_du_mois import DashboardEntreesMoisView
from .evolution_stock import EvolutionStockView
from .produit_dormant import ProduitsDormantsView
from .produit_en_ruptures import DashboardRupturesView
from .produit_sous_seuil import DashboardSousSeuilView
from .repartition_cat import RepartitionCategorieView
from .repartition_magasin import RepartitionMagasinView
from .sorties_du_mois import DashboardSortiesMoisView
from .top_consommes import TopConsommesView

__all__ = [
    'ConsommationMensuelleView',
    'DashboardArticlesView',
    'DashboardEntreesMoisView',
    'DashboardKPIsView',
    'DashboardRupturesView',
    'DashboardSortiesMoisView',
    'DashboardSousSeuilView',
    'EvolutionStockView',
    'ProduitsDormantsView',
    'RepartitionCategorieView',
    'RepartitionMagasinView',
    'TopConsommesView'
]