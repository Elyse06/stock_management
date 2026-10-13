from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from apps.catalogue.models import Article
from apps.common import actions as a
from apps.employee.models import Employer
from apps.stock.models import DetailMouvement, Mouvement, Salle, UniteArticle

from . import factories as f

T = Mouvement.Type


class _UnitesBase(TestCase):
    """Un article à numéro de série, un magasin, et un client ayant le droit de lire les unités."""

    def setUp(self):
        self.siege = f.siege()
        self.article = f.article("LAP", immobilisation=True)
        Article.objects.filter(pk=self.article.pk).update(mode_suivi=Article.ModeSuivi.NUMERO_SERIE)
        self.article.refresh_from_db()
        mag = f.magasin("Central", self.siege)
        self.entree = DetailMouvement.objects.get(mouvement=f.mouvement(T.ENTREE, self.article, 9, destination=mag))
        self.sortie = DetailMouvement.objects.get(mouvement=f.mouvement(T.SORTIE, self.article, 9, source=mag))
        self.client = APIClient()
        self.client.force_authenticate(f.utilisateur("u@test.mg", [a.INV_LIRE, a.MOV_LIRE]))

    def _unite(self, numero, beneficiaire):
        unite = UniteArticle.objects.create(article=self.article, numero_de_serie=numero, mouvement_entree=self.entree)
        unite.attribuer(beneficiaire, self.sortie)
        return unite

    def _liste(self):
        data = self.client.get("/api/stock/unites-article/?statut=ATTRIBUE").json()
        return {u["numero_de_serie"]: u for u in data.get("results", data)}


class UnitesEtiquetteTests(_UnitesBase):
    """Champs utilisés par l'étiquette QR : catégorie de l'article et site du bénéficiaire."""

    def test_site_selon_le_type_de_beneficiaire(self):
        employe = f.employe("M-1")
        employe.emp_site_id = self.siege
        employe.save()
        self._unite("SN-1", employe)
        self._unite("SN-2", Salle.objects.create(nom="Serveurs", localite=self.siege))
        self._unite("SN-3", f.direction("DSI"))
        unites = self._liste()
        self.assertEqual(unites["SN-1"]["site_beneficiaire_nom"], "Siège")
        self.assertEqual(unites["SN-2"]["site_beneficiaire_nom"], "Siège")
        self.assertIsNone(unites["SN-3"]["site_beneficiaire_nom"])
        self.assertEqual(unites["SN-1"]["article_categorie"], "Matériel")

    def test_nombre_de_requetes_constant(self):
        def compter():
            with CaptureQueriesContext(connection) as ctx:
                self._liste()
            return len(ctx.captured_queries)

        self._unite("SN-1", f.employe("M-1"))
        compter()  # préchauffage (chargement des droits de l'utilisateur)
        avant = compter()
        for i in range(2, 7):
            self._unite(f"SN-{i}", f.employe(f"M-{i}"))
        self.assertEqual(compter(), avant)


class UnitesParBeneficiaireTests(_UnitesBase):
    """Regroupement des unités attribuées par bénéficiaire (1er tableau de la page Unités)."""

    def setUp(self):
        super().setUp()
        self.rabe = f.employe("M-RABE")
        Employer.objects.filter(pk=self.rabe.pk).update(emp_nom="RABE Marie")
        self.dsi = f.direction("DSI")
        for numero in ("A1", "A2", "A3"):
            self._unite(numero, self.rabe)
        self._unite("B1", self.dsi)
        UniteArticle.objects.filter(numero_de_serie="A3").update(etat=UniteArticle.Etat.MAUVAIS)
        UniteArticle.objects.create(article=self.article, numero_de_serie="EN-STOCK", mouvement_entree=self.entree)

    def _groupes(self, **params):
        return self.client.get("/api/stock/unites-article/par-beneficiaire/", params).json()

    def test_nombre_d_unites_par_beneficiaire_trie_par_nom(self):
        data = self._groupes()
        self.assertEqual(data["count"], 2)
        self.assertEqual(
            [(g["beneficiaire_nom"], g["beneficiaire_type"], g["nb_unites"]) for g in data["results"]],
            [("DSI", "DIRECTION", 1), ("RABE Marie", "EMPLOYE", 3)],
        )
        self.assertEqual(data["results"][1]["matricule"], "M-RABE")

    def test_les_filtres_de_la_liste_s_appliquent(self):
        self.assertEqual([g["nb_unites"] for g in self._groupes(etat="MAUVAIS")["results"]], [1])
        self.assertEqual([g["beneficiaire_nom"] for g in self._groupes(beneficiaire_type="DIRECTION")["results"]], ["DSI"])
        self.assertEqual([g["beneficiaire_nom"] for g in self._groupes(search="rabe")["results"]], ["RABE Marie"])

    def test_le_detail_correspond_au_nombre_affiche(self):
        groupe = next(g for g in self._groupes(etat="BON")["results"] if g["beneficiaire_nom"] == "RABE Marie")
        detail = self.client.get("/api/stock/unites-article/", {
            "affectation": groupe["affectation_id"], "statut": "ATTRIBUE", "etat": "BON",
        }).json()
        self.assertEqual(detail["count"], groupe["nb_unites"])
        self.assertEqual(sorted(u["numero_de_serie"] for u in detail["results"]), ["A1", "A2"])
