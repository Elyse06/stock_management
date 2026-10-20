import shutil
import subprocess
import tempfile
import unittest

from django.test import TestCase

from apps.commande.models import AttributionDetailCommande, Commande
from apps.common import actions as a
from apps.employee.models import Employer
from apps.stock.models import DemandeUnite, Mouvement

from . import factories as f
from .test_securite import client_pour
from .test_unites import _UnitesBase

PDFTOTEXT = shutil.which("pdftotext")


def texte_pdf(contenu):
    """Texte d'un PDF (vérification du contenu lorsque pdftotext est installé)."""
    with tempfile.NamedTemporaryFile(suffix=".pdf") as fichier:
        fichier.write(contenu)
        fichier.flush()
        return subprocess.run([PDFTOTEXT, "-layout", fichier.name, "-"], capture_output=True, text=True, check=True).stdout


class FicheCommandeTests(TestCase):
    def setUp(self):
        self.dir_ = f.direction("DSI")
        self.demandeur = f.employe("D-1", self.dir_)
        Employer.objects.filter(pk=self.demandeur.pk).update(emp_nom="RABE Marie")
        self.demandeur.refresh_from_db()
        self.gest = f.employe("G-1", self.dir_)
        self.c_dem = client_pour(f.utilisateur("dem@test.mg", [a.COM_DEM], employe=self.demandeur))
        self.c_chef = client_pour(f.utilisateur("chef@test.mg", [a.COM_DEM, a.COM_VAL], employe=f.employe("C-1", self.dir_)))
        self.c_gest = client_pour(f.utilisateur("gest@test.mg", [a.COM_DEM, a.COM_VAL, a.CAT_GERE], employe=self.gest))
        self.magasin = f.magasin("Magasin central")
        self.article = f.article("RAM")
        f.mouvement(Mouvement.Type.ENTREE, self.article, 10, destination=self.magasin)
        reponse = self.c_dem.post("/api/commandes/commandes/", {
            "objet": "Papier <b>urgent</b> & co",  # balises et esperluette : affichées telles quelles
            "details": [{"article": self.article.pk, "quantite": 4, "attributions": [
                {"employe_beneficiaire": self.demandeur.pk, "quantite": 4, "quantite_demandee": 4}]}],
        }, format="json")
        self.commande_id = reponse.data["commande_id"]
        url = f"/api/commandes/commandes/{self.commande_id}/traiter/"
        self.c_chef.post(url, {"statut": "EN_COURS"}, format="json")
        attribution = AttributionDetailCommande.objects.get()
        self.c_gest.post(url, {"statut": "VALIDEE", "magasin_source": self.magasin.pk, "commentaire_agent": "Remis au guichet",
                               "validations": [{"attribution_id": attribution.pk, "statut": "VALIDEE", "quantite_validee": 4}]}, format="json")
        self.url = f"/api/commandes/commandes/{self.commande_id}/pdf/"

    def test_le_gestionnaire_telecharge_la_fiche(self):
        self.assertEqual(Commande.objects.get(pk=self.commande_id).statut, "VALIDEE")
        reponse = self.c_gest.get(self.url)
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse["Content-Type"], "application/pdf")
        self.assertEqual(reponse["Content-Disposition"], f'attachment; filename="commande_{self.commande_id}.pdf"')
        self.assertEqual(reponse["Cache-Control"], "no-store")
        self.assertTrue(reponse.content.startswith(b"%PDF"))

    @unittest.skipUnless(PDFTOTEXT, "pdftotext non installé")
    def test_contenu_de_la_fiche(self):
        texte = texte_pdf(self.c_gest.get(self.url).content)
        for attendu in ("Fiche de demande de matériel", f"Commande n°{self.commande_id}", "Validée", "RABE Marie", "DSI",
                        "Article RAM", "RABE Marie : 4 demandée(s)", "4 validée(s)", "Magasin central", "Remis au guichet", "Papier <b>urgent</b> & co",
                        "Le demandeur", "Le gestionnaire du stock", "Édité le", "Page 1 / 1"):
            self.assertIn(attendu, texte, attendu)

    def test_gestionnaire_et_chef_hierarchique_seulement(self):
        self.assertEqual(self.c_dem.get(self.url).status_code, 403)
        self.assertEqual(self.c_chef.get(self.url).status_code, 200)  # commande traitée de sa direction

    def test_chef_hierarchique_seulement_pour_les_commandes_traitees(self):
        Commande.objects.filter(pk=self.commande_id).update(statut=Commande.Statut.EN_COURS)
        self.assertEqual(self.c_chef.get(self.url).status_code, 403)
        self.assertEqual(self.c_gest.get(self.url).status_code, 200)
        autre = client_pour(f.utilisateur("chef-dex@test.mg", [a.COM_DEM, a.COM_VAL], employe=f.employe("C-2", f.direction("DEX"))))
        Commande.objects.filter(pk=self.commande_id).update(statut=Commande.Statut.VALIDEE)
        self.assertEqual(autre.get(self.url).status_code, 404)  # commande d'une autre direction : invisible


class FicheDemandeUniteTests(_UnitesBase):
    def setUp(self):
        super().setUp()
        dsi = f.direction("DSI")
        self.marie = f.employe("M-1", dsi)
        self.c_marie = client_pour(f.utilisateur("marie@test.mg", [a.COM_DEM, a.COM_VAL], employe=self.marie))
        self.c_gest = client_pour(f.utilisateur("gest@test.mg", [a.INV_GERE], employe=f.employe("G-1")))
        unite = self._unite("SN-DELL-007", self.marie)
        reponse = self.c_marie.post("/api/stock/demandes-unites/", {
            "unite_id": unite.pk, "type_demande": "TRANSFERT", "motif": "Changement de poste",
            "nouvelle_direction_beneficiaire": f.direction("DEX").pk}, format="json")
        self.demande_id = reponse.data["demande_id"]
        self.url = f"/api/stock/demandes-unites/{self.demande_id}/pdf/"

    def test_le_gestionnaire_du_stock_telecharge_la_fiche(self):
        reponse = self.c_gest.get(self.url)
        self.assertEqual((reponse.status_code, reponse["Content-Type"]), (200, "application/pdf"))
        self.assertEqual(reponse["Content-Disposition"], f'attachment; filename="demande_{self.demande_id}.pdf"')
        self.assertTrue(reponse.content.startswith(b"%PDF"))
        self.assertEqual(DemandeUnite.objects.get(pk=self.demande_id).statut, "EN_ATTENTE")

    @unittest.skipUnless(PDFTOTEXT, "pdftotext non installé")
    def test_contenu_de_la_fiche(self):
        texte = texte_pdf(self.c_gest.get(self.url).content)
        for attendu in ("Fiche de demande de transfert", f"Demande n°{self.demande_id}", "SN-DELL-007", "DEX",
                        "Changement de poste", "Non traitée", "Le demandeur", "Le gestionnaire du stock"):
            self.assertIn(attendu, texte, attendu)

    def test_reservee_au_gestionnaire_du_stock(self):
        self.assertEqual(self.c_marie.get(self.url).status_code, 403)
