from contextlib import nullcontext
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import patch

import pandas as pd
from django.test import TestCase
from django.test import SimpleTestCase

from apps.catalogue.models import Article, Categorie
from apps.employee.models import Direction, Site
from apps.stock.models import Affectation, InventaireSession, Salle, UniteArticle
from apps.stock.serializers import InventaireSessionSerializer, SalleSerializer
from apps.stock.services_import.import_fournitures import (
    _traiter_ligne,
    colonnes_manquantes,
    detecter_date_import,
    detecter_index_entete,
    normaliser_colonnes,
)
from apps.stock.services.valider_inventaire import valider_session_inventaire
from apps.stock.utils import calculer_stock_theorique
from apps.stock.views.unite_article import UniteArticleViewSet


class FournitureExcelHeaderTests(SimpleTestCase):
    @patch("apps.stock.services_import.import_fournitures.pd.read_excel")
    def test_detects_header_after_report_date(self, read_excel):
        read_excel.return_value = pd.DataFrame([
            [None, None, "DATE 30/09/26"],
            [None, "ARTICLES", "QTE RESTANT", "OBSERVATION"],
        ])

        self.assertEqual(detecter_index_entete(BytesIO()), 1)

    @patch("apps.stock.services_import.import_fournitures.pd.read_excel")
    def test_reads_date_above_header(self, read_excel):
        read_excel.return_value = pd.DataFrame([[None, None, "DATE 30/09/26"]])

        self.assertEqual(
            detecter_date_import(BytesIO(), ligne_entete=1).isoformat(),
            "2026-09-30",
        )

    def test_normalizes_article_header_alias(self):
        frame = normaliser_colonnes(pd.DataFrame(columns=[
            " article ", "QTE RESTANT", "OBSERVATION",
        ]))

        self.assertEqual(colonnes_manquantes(frame), [])
        self.assertIn("ARTICLES", frame.columns)

    @patch("apps.stock.services_import.import_fournitures.DetailMouvement.objects.create")
    @patch("apps.stock.services_import.import_fournitures.get_or_create_article")
    @patch("apps.stock.services_import.import_fournitures.get_or_create_categorie")
    @patch("apps.stock.services_import.import_fournitures.transaction.atomic")
    def test_import_reads_articles_quantity_and_observation(
        self, atomic, get_categorie, get_article, create_detail
    ):
        atomic.return_value = nullcontext()
        categorie = SimpleNamespace(cat_libelle="FR")
        article = SimpleNamespace(code_article="FR-0001", designation="Crayon")
        mouvement = object()
        get_categorie.return_value = categorie
        get_article.return_value = (article, True)
        mouvements = SimpleNamespace(
            magasin_siege=object(),
            entree=lambda _: mouvement,
        )

        resultat = _traiter_ligne(
            pd.Series({
                "ARTICLES": "Crayon",
                "QTE RESTANT": 4.0,
                "OBSERVATION": "Boîte bleue",
            }),
            mouvements,
        )

        self.assertEqual(resultat["designation"], "Crayon")
        self.assertEqual(resultat["quantite"], 4)
        self.assertEqual(resultat["observation"], "Boîte bleue")
        create_detail.assert_called_once_with(
            mouvement=mouvement,
            article=article,
            quantite=4,
        )


class SalleSerializerTests(TestCase):
    def test_salle_requires_a_headquarters_site(self):
        agence = Site.objects.create(
            site_nom="Agence", site_type="AGENCE", localite="Nord"
        )

        serializer = SalleSerializer(
            data={"nom": "Salle de réunion", "localite": agence.pk}
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("localite", serializer.errors)

    def test_salle_can_be_shared_as_an_affectation(self):
        siege = Site.objects.create(
            site_nom="Siège", site_type="SIEGE", localite="Centre"
        )
        serializer = SalleSerializer(
            data={"nom": "Salle de réunion", "localite": siege.pk}
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        salle = serializer.save()

        affectation = Affectation.resoudre(salle)

        self.assertEqual(affectation.beneficiaire_type, Affectation.BeneficiaireType.SALLE)
        self.assertEqual(affectation.cible, salle)
        self.assertEqual(Salle.objects.count(), 1)


class ResumeStockUnitesTests(TestCase):
    def test_resume_groups_only_in_stock_units_by_article_and_etat(self):
        categorie = Categorie.objects.create(cat_libelle="Matériel")
        article = Article.objects.create(
            code_article="ART001",
            designation="Ordinateur",
            categorie=categorie,
        )
        UniteArticle.objects.create(article=article, etat=UniteArticle.Etat.BON)
        UniteArticle.objects.create(article=article, etat=UniteArticle.Etat.BON)
        UniteArticle.objects.create(article=article, etat=UniteArticle.Etat.MOYEN)
        UniteArticle.objects.create(
            article=article,
            statut=UniteArticle.Statut.ATTRIBUE,
            affectation=Affectation.pour_site(
                Site.objects.create(site_nom="Agence", site_type="AGENCE", localite="Nord")
            ),
        )

        response = UniteArticleViewSet().resume_stock(None)

        self.assertEqual(response.data, [{
            "article_code": "ART001",
            "article_designation": "Ordinateur",
            "total": 3,
            "etats": {
                "BON": 2,
                "MOYEN": 1,
                "MAUVAIS": 0,
                "HORS_USAGE": 0,
                "PERDU": 0,
            },
        }])


class InventaireSessionLocationTests(TestCase):
    def test_accepts_agency_site_as_inventory_location(self):
        agence = Site.objects.create(
            site_nom="Agence", site_type="AGENCE", localite="Nord"
        )
        serializer = InventaireSessionSerializer(data={"site": agence.pk, "lignes": []})

        self.assertTrue(serializer.is_valid(), serializer.errors)
        session = serializer.save()
        self.assertEqual(session.site, agence)

    def test_rejects_headquarters_without_direction_or_room(self):
        siege = Site.objects.create(
            site_nom="Siège", site_type="SIEGE", localite="Centre"
        )
        serializer = InventaireSessionSerializer(data={"site": siege.pk, "lignes": []})

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)

    def test_rejects_direction_belonging_to_an_agency(self):
        agence = Site.objects.create(
            site_nom="Agence", site_type="AGENCE", localite="Nord"
        )
        direction = Direction.objects.create(
            dir_id="D001",
            dir_libelle="Direction régionale",
            dir_description="",
            site=agence,
        )
        serializer = InventaireSessionSerializer(data={"service": direction.pk, "lignes": []})

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)

    def test_accepts_room_at_headquarters(self):
        siege = Site.objects.create(
            site_nom="Siège", site_type="SIEGE", localite="Centre"
        )
        salle = Salle.objects.create(nom="Salle 101", localite=siege)
        serializer = InventaireSessionSerializer(data={"salle": salle.pk, "lignes": []})

        self.assertTrue(serializer.is_valid(), serializer.errors)
        session = serializer.save()
        self.assertEqual(session.salle, salle)

    def test_validated_site_inventory_updates_that_sites_theoretical_stock(self):
        agence = Site.objects.create(
            site_nom="Agence", site_type="AGENCE", localite="Nord"
        )
        categorie = Categorie.objects.create(cat_libelle="Matériel")
        article = Article.objects.create(
            code_article="ART002",
            designation="Écran",
            categorie=categorie,
        )
        serializer = InventaireSessionSerializer(data={
            "site": agence.pk,
            "lignes": [{"article": article.code_article, "quantite_physique": 3}],
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        session = serializer.save()
        valider_session_inventaire(session)

        self.assertEqual(
            calculer_stock_theorique(article=article, site=agence),
            3,
        )