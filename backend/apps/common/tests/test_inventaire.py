"""Inventaire : type d'articles, signataires, écarts conservés après validation et fiche PDF."""
import unittest

from django.test import TestCase

from apps.common import actions as a
from apps.employee.models import Employer
from apps.stock.fiche_inventaire_pdf import ajustements
from apps.stock.models import InventaireSession, LigneInventaire, Mouvement

from . import factories as f
from .test_fiches_pdf import PDFTOTEXT, texte_pdf
from .test_securite import client_pour

URL = "/api/stock/inventaires/"


class InventaireTests(TestCase):
    def setUp(self):
        self.magasin = f.magasin("Magasin central")
        self.papier = f.article("PAPA4", immobilisation=False)
        self.pc = f.article("PC", immobilisation=True)
        f.mouvement(Mouvement.Type.ENTREE, self.papier, 10, destination=self.magasin)
        self.agent = f.employe("G-1")
        Employer.objects.filter(pk=self.agent.pk).update(emp_nom="RAKOTO Jean")
        self.valideur = f.employe("V-1")
        Employer.objects.filter(pk=self.valideur.pk).update(emp_nom="RABE Hery")
        self.c_gest = client_pour(f.utilisateur("gest@test.mg", [a.INV_GERE, a.INV_LIRE], employe=self.agent))
        self.c_val = client_pour(f.utilisateur("val@test.mg", [a.INV_VAL, a.INV_LIRE], employe=self.valideur))

    def creer(self, type_articles="FOURNITURE", lignes=None):
        return self.c_gest.post(URL, {
            "magasin": self.magasin.pk, "type_articles": type_articles,
            "lignes": lignes or [{"article": "PAPA4", "quantite_physique": 8, "commentaire": "2 ramettes abîmées jetées"}],
        }, format="json")

    def test_type_articles_controle(self):
        reponse = self.creer("FOURNITURE", [{"article": "PC", "quantite_physique": 1}])
        self.assertEqual(reponse.status_code, 400)
        self.assertIn("PC", str(reponse.data))
        self.assertEqual(self.creer("IMMOBILISATION", [{"article": "PC", "quantite_physique": 1}]).status_code, 201)

    def test_signataires_et_ecarts_conserves_apres_validation(self):
        reponse = self.creer()
        self.assertEqual(reponse.status_code, 201, reponse.data)
        self.assertEqual((reponse.data["type_articles"], reponse.data["realise_par_nom"]), ("FOURNITURE", "RAKOTO Jean"))
        session_id = reponse.data["inventaire_id"]
        self.assertEqual(self.c_gest.get(f"{URL}{session_id}/pdf/").status_code, 400)  # pas encore validé
        valide = self.c_val.post(f"{URL}{session_id}/valider/").data
        self.assertEqual((valide["statut"], valide["valide_par_nom"]), ("VALIDE", "RABE Hery"))
        ligne = LigneInventaire.objects.get()
        self.assertEqual((ligne.quantite_theorique, ligne.quantite_physique, ligne.ecart), (10, 8, -2))

    @unittest.skipUnless(PDFTOTEXT, "pdftotext non installé")
    def test_fiche_pdf(self):
        session_id = self.creer().data["inventaire_id"]
        self.c_val.post(f"{URL}{session_id}/valider/")
        reponse = self.c_gest.get(f"{URL}{session_id}/pdf/")
        self.assertEqual((reponse.status_code, reponse["Content-Type"]), (200, "application/pdf"))
        code = InventaireSession.objects.get().code_reference
        self.assertEqual(reponse["Content-Disposition"], f'attachment; filename="inventaire_{code}.pdf"')
        texte = texte_pdf(reponse.content)
        for attendu in ("Fiche d'inventaire", code, "Magasin central", "Fournitures", "Article PAPA4", "-2",
                        "2 ramettes abîmées jetées", "Réalisé par", "RAKOTO Jean", "Validé par", "RABE Hery"):
            self.assertIn(attendu, texte, attendu)

    def test_ajustements_en_clair(self):
        self.assertEqual(ajustements({
            "ajouts": [{"numero_serie": "SN-9", "etat": "BON"}],
            "retraits": [{"unite_id": 4, "numero_serie": "SN-4"}],
            "changements_etat": [{"unite_id": 1, "etat": "MOYEN"}, {"unite_id": 2, "etat": "MAUVAIS"},
                                 {"unite_id": 3, "etat": "MAUVAIS"}],
        }), ["Ajout : SN-9 (Bon état)", "Retrait : SN-4 (perdu)", "1 → État moyen", "2 → Mauvais état"])


class EtiquetteTests(TestCase):
    """Étiquette d'une unité : n° d'immobilisation et date saisis, enregistrés pour les impressions suivantes."""

    def setUp(self):
        from apps.stock.models import UniteArticle

        self.unite = UniteArticle.objects.create(article=f.article("PC", immobilisation=True))
        self.url = f"/api/stock/unites-article/{self.unite.pk}/etiquette/"

    def test_enregistree_par_le_gestionnaire(self):
        gest = client_pour(f.utilisateur("gest@test.mg", [a.INV_GERE, a.INV_LIRE]))
        reponse = gest.post(self.url, {"numero_immobilisation": " IMMO-2026-0042 ", "date_etiquette": "2026-10-20"}, format="json")
        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.assertEqual((reponse.data["numero_immobilisation"], reponse.data["date_etiquette"]), ("IMMO-2026-0042", "2026-10-20"))
        self.assertEqual(gest.get("/api/stock/unites-article/", {"search": "IMMO-2026"}).data["count"], 1)
        self.assertEqual(gest.post(self.url, {"numero_immobilisation": "", "date_etiquette": "x"}, format="json").status_code, 400)

    def test_lecture_seule_refusee(self):
        lecteur = client_pour(f.utilisateur("lect@test.mg", [a.INV_LIRE]))
        self.assertEqual(lecteur.post(self.url, {"numero_immobilisation": "X", "date_etiquette": "2026-10-20"}, format="json").status_code, 403)
