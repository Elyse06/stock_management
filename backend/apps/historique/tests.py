from types import SimpleNamespace

from django.test import TestCase
from django.utils import timezone

from apps.catalogue.models import Article, Categorie
from apps.employee.models import Site
from apps.stock.models import Affectation, DetailMouvement, Magasin, Mouvement, Salle
from apps.historique.views.localisation import HistoriqueLocalisationView


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
        })

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
