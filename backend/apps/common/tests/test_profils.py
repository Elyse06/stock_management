"""Profils Standard et Chef hiérarchique : retrait de MOV_LIRE (migration de données)."""
import importlib

from django.apps import apps as django_apps
from django.test import TestCase

from apps.common import actions as a
from apps.utilisateur.models import Autoriser
from apps.utilisateur.roles import PRESETS, determiner_role

from . import factories as f

migration = importlib.import_module("apps.utilisateur.migrations.0004_profils_sans_mov_lire")


def droits(user):
    return set(Autoriser.objects.filter(autoriser_utilisateur_id=user).values_list("autoriser_action_id_id", flat=True))


class ProfilsTests(TestCase):
    def test_profils_sans_mov_lire(self):
        self.assertEqual(PRESETS["STANDARD"], {a.CAT_LIRE, a.COM_DEM})
        self.assertEqual(PRESETS["VALIDATEUR_CMD"], {a.CAT_LIRE, a.COM_DEM, a.COM_VAL})
        self.assertEqual(determiner_role({a.CAT_LIRE, a.COM_DEM}, list(a.TOUTES))[0], "STANDARD")

    def test_migration_ne_touche_que_les_deux_profils(self):
        standard = f.utilisateur("std@test.mg", [a.CAT_LIRE, a.MOV_LIRE, a.COM_DEM])
        chef = f.utilisateur("chef@test.mg", [a.CAT_LIRE, a.MOV_LIRE, a.COM_DEM, a.COM_VAL])
        perso = f.utilisateur("perso@test.mg", [a.CAT_LIRE, a.MOV_LIRE, a.COM_DEM, a.INV_LIRE])
        gestionnaire = f.utilisateur("gest@test.mg", list(PRESETS["GESTIONNAIRE"]))
        migration.retirer_mov_lire(django_apps, None)
        self.assertEqual(droits(standard), {a.CAT_LIRE, a.COM_DEM})
        self.assertEqual(droits(chef), {a.CAT_LIRE, a.COM_DEM, a.COM_VAL})
        self.assertIn(a.MOV_LIRE, droits(perso))
        self.assertEqual(droits(gestionnaire), PRESETS["GESTIONNAIRE"])
        migration.remettre_mov_lire(django_apps, None)
        self.assertIn(a.MOV_LIRE, droits(standard))


class FiltreTypeArticleTests(TestCase):
    """Filtre « immobilisation / fourniture » sur les listes d'articles."""

    def setUp(self):
        from rest_framework.test import APIClient

        self.immo = f.article("PC", immobilisation=True)
        self.fourniture = f.article("PAPIER", immobilisation=False)
        magasin = f.magasin("Central")
        f.mouvement("ENTREE", self.immo, 3, destination=magasin)
        f.mouvement("ENTREE", self.fourniture, 9, destination=magasin)
        self.client = APIClient()
        self.client.force_authenticate(f.utilisateur("gest@test.mg", list(PRESETS["GESTIONNAIRE"])))

    def codes(self, url, cle="code_article", **params):
        return sorted(ligne[cle] for ligne in self.client.get(url, params).json()["results"])

    def test_parametre(self):
        from apps.common.params import filtre_type_article

        self.assertEqual(filtre_type_article({"is_immobilisation": "true"}), {"is_immobilisation": True})
        self.assertEqual(filtre_type_article({"is_immobilisation": "false"}, "article__is_immobilisation"),
                         {"article__is_immobilisation": False})
        self.assertEqual(filtre_type_article({"is_immobilisation": ""}), {})
        self.assertEqual(filtre_type_article({}), {})

    def test_catalogue_et_tableau_de_bord(self):
        self.assertEqual(self.codes("/api/catalogue/articles/", is_immobilisation="true"), ["PC"])
        self.assertEqual(self.codes("/api/dashboard/kpis/articles/", is_immobilisation="false"), ["PAPIER"])
        self.assertEqual(self.codes("/api/dashboard/kpis/articles/"), ["PAPIER", "PC"])
        entrees = self.client.get("/api/dashboard/kpis/entrees-mois/", {"is_immobilisation": "true"}).json()
        self.assertEqual([ligne["article_code"] for ligne in entrees["results"]], ["PC"])
        self.assertEqual(entrees["total_quantite"], 3)

    def test_categorie_complete_dans_le_catalogue(self):
        ligne = self.client.get("/api/catalogue/articles/", {"is_immobilisation": "true"}).json()["results"][0]
        self.assertIn("categorie_description", ligne)
