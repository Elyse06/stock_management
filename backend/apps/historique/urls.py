from django.urls import path

from .views import (
    HistoriqueArticleExportView,
    HistoriqueArticleView,
    HistoriqueGlobaleView,
    HistoriqueLocalisationView,
)

urlpatterns = [
    path("globale/", HistoriqueGlobaleView.as_view(), name="historique-globale"),
    path("localisation/", HistoriqueLocalisationView.as_view(), name="historique-localisation"),
    path("article/<str:code_article>/", HistoriqueArticleView.as_view(), name="historique-article"),
    path("article/<str:code_article>/export/", HistoriqueArticleExportView.as_view(), name="historique-article-export"),
]