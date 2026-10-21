from types import SimpleNamespace

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.catalogue.models import Article, Categorie
from apps.common import actions
from apps.common.tests.factories import direction, employe, utilisateur
from apps.employee.models import Site
from apps.historique.views.localisation import HistoriqueLocalisationView
from apps.stock.models import Affectation, DetailMouvement, Magasin, Mouvement, Salle


class HistoriqueLocalisationSalleTests(TestCase):
    def test_returns_stock_for_selected_salle(self):
        categorie = Categorie.objects.create(cat_libelle="Matériel")
        article = Article.objects.create(
            code_article="ART001",
            designation="Ordinateur",
            categorie=categorie,
        )
        siege = Site.objects.create(
            site_nom="Siège", site_type="SIEGE", localite="Centre"
        )
        salle = Salle.objects.create(nom="Salle 101", localite=siege)
        affectation = Affectation.pour_salle(salle)
        magasin = Magasin.objects.create(magasin_nom="Magasin principal")
        DetailMouvement.objects.create(
            mouvement=Mouvement.objects.create(
                type_mouvement=Mouvement.Type.SORTIE,
                magasin_source=magasin,
            ),
            article=article,
            quantite=5,
            affectation=affectation,
        )
        DetailMouvement.objects.create(
            mouvement=Mouvement.objects.create(
                type_mouvement=Mouvement.Type.RETOUR,
                magasin_destination=magasin,
            ),
            article=article,
            quantite=2,
            affectation=affectation,
        )
        request = SimpleNamespace(query_params={
            "date": timezone.localdate().isoformat(),
            "salle_id": str(salle.salle_id),
        }, user=utilisateur("lecteur@test.mg", [actions.MOV_LIRE]))

        response = HistoriqueLocalisationView().get(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [{
            "article_code": article.code_article,
            "article_designation": article.designation,
            "stock": 3,
        }])

    def test_requires_exactly_one_location(self):
        request = SimpleNamespace(query_params={
            "date": "2026-10-05",
            "salle_id": "1",
            "site_id": "1",
        })

        response = HistoriqueLocalisationView().get(request)

        self.assertEqual(response.status_code, 400)


class HistoriqueLocalisationDirectionTests(TestCase):
    """Profils Standard et Chef hiérarchique (sans MOV_LIRE) : uniquement l'historique de leur direction."""

    def setUp(self):
        self.dsi, self.dex = direction("DSI"), direction("DEX")
        self.client = APIClient()
        self.client.force_authenticate(utilisateur("std@test.mg", [actions.CAT_LIRE, actions.COM_DEM], employe=employe("S-1", self.dsi)))
        self.url = "/api/historique/localisation/"
        self.jour = timezone.localdate().isoformat()

    def test_sa_direction_seulement(self):
        self.assertEqual(self.client.get(self.url, {"date": self.jour, "direction_id": self.dsi.pk}).status_code, 200)
        self.assertEqual(self.client.get(self.url, {"date": self.jour, "direction_id": self.dex.pk}).status_code, 403)
        site = Site.objects.create(site_nom="Agence", site_type="AGENCE", localite="Tamatave")
        self.assertEqual(self.client.get(self.url, {"date": self.jour, "site_id": site.pk}).status_code, 403)

    def test_autres_historiques_refuses(self):
        self.assertEqual(self.client.get("/api/historique/globale/").status_code, 403)
