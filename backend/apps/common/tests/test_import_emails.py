import re

from django.core import mail
from django.test import TestCase
from rest_framework.test import APIClient

from apps.common import actions as a
from apps.employee.models import Employer
from apps.utilisateur.models import Autoriser, Utilisateur

from . import factories as f
from .test_flux import fichier_excel
from .test_securite import client_pour

URL = "/api/employee/employee/import-emails/"
ENTETE = ["Adresse électronique", "Prénom et nom", "Type", "Matricule"]


def lignes(*valeurs):
    """Lignes au format du fichier réel : seules l'adresse et le matricule sont utilisés."""
    return [dict(zip(ENTETE, (email, "Nom ignoré", "Type ignoré", matricule), strict=True)) for email, matricule in valeurs]


class ImportEmailsTests(TestCase):
    def setUp(self):
        f.utilisateur("init@test.mg", [a.CAT_LIRE, a.MOV_LIRE, a.COM_DEM])  # crée les actions du profil standard
        self.admin = f.utilisateur("admin@test.mg", [a.USR_GERE])
        self.client = client_pour(self.admin)
        self.rakoto = f.employe("8101")
        self.rabe = f.employe("8102")

    def importer(self, *valeurs, **options):
        reponse = self.client.post(URL, {"fichier": fichier_excel(lignes(*valeurs)), "dry_run": "false", **options})
        self.assertEqual(reponse.status_code, 200, reponse.data)
        return reponse

    def test_creation_du_compte_et_envoi_de_l_acces(self):
        with self.captureOnCommitCallbacks(execute=True):
            rapport = self.importer(("Jean.Rakoto@Paositra.mg", 8101)).data  # matricule numérique, comme dans Excel
        self.assertEqual((rapport["lignes_creees"], rapport["lignes_erreur"]), (1, 0))
        self.assertEqual(rapport["identifiants"], [{"matricule": "8101", "nom": self.rakoto.emp_nom, "email": "jean.rakoto@paositra.mg"}])
        self.assertNotIn("mot_de_passe_temporaire", rapport)  # aucun mot de passe dans la réponse
        self.rakoto.refresh_from_db()
        compte = self.rakoto.emp_utilisateur_id
        self.assertEqual(compte.utilisateur_mail, "jean.rakoto@paositra.mg")
        self.assertTrue(compte.mdp_a_changer)
        self.assertIsNotNone(compte.acces_envoye_le)
        self.assertEqual(sorted(Autoriser.objects.filter(autoriser_utilisateur_id=compte).values_list("autoriser_action_id_id", flat=True)),
                         sorted([a.CAT_LIRE, a.COM_DEM, a.MOV_LIRE]))
        self.assertEqual([m.to for m in mail.outbox], [["jean.rakoto@paositra.mg"]])
        jeton = re.search(r"/activation#(\S+)", mail.outbox[0].body).group(1)
        activation = APIClient().post("/api/auth/activation/", {"jeton": jeton, "nouveau": "Rakoto-Paositra-26"}, format="json")
        self.assertEqual(activation.status_code, 200)
        connexion = APIClient().post("/api/auth/login/", {"utilisateur_mail": "jean.rakoto@paositra.mg", "password": "Rakoto-Paositra-26"}, format="json")
        self.assertEqual((connexion.status_code, connexion.data["mdp_a_changer"]), (200, False))

    def test_apercu_sans_ecriture_ni_envoi(self):
        with self.captureOnCommitCallbacks(execute=True) as rappels:
            rapport = self.client.post(URL, {"fichier": fichier_excel(lignes(("jean@paositra.mg", "8101"))), "dry_run": "true"}).data
        self.assertEqual((rapport["lignes_creees"], rapport["identifiants"]), (1, []))
        self.assertEqual((rappels, mail.outbox), ([], []))
        self.assertFalse(Utilisateur.objects.filter(utilisateur_mail="jean@paositra.mg").exists())

    def test_mise_a_jour_de_l_adresse_d_un_compte_existant(self):
        compte = f.utilisateur("ancien@paositra.mg", employe=self.rakoto)
        rapport = self.importer(("nouveau@paositra.mg", "8101")).data
        compte.refresh_from_db()
        self.assertEqual((rapport["lignes_maj"], compte.utilisateur_mail), (1, "nouveau@paositra.mg"))
        self.assertEqual(rapport["identifiants"], [])  # compte existant : mot de passe inchangé
        self.assertFalse(compte.mdp_a_changer)
        self.assertIn("ancien@paositra.mg", rapport["details"][0]["message"])

    def test_mise_a_jour_desactivee(self):
        compte = f.utilisateur("ancien@paositra.mg", employe=self.rakoto)
        rapport = self.importer(("nouveau@paositra.mg", "8101"), overwrite="false").data
        compte.refresh_from_db()
        self.assertEqual((rapport["lignes_ignorees"], compte.utilisateur_mail), (1, "ancien@paositra.mg"))

    def test_rattachement_d_un_compte_libre_portant_l_adresse(self):
        libre = f.utilisateur("rabe@paositra.mg")
        rapport = self.importer(("RABE@paositra.mg", "8102")).data
        self.rabe.refresh_from_db()
        self.assertEqual((rapport["details"][0]["statut"], self.rabe.emp_utilisateur_id), ("RATTACHÉ", libre))

    def test_erreurs_signalees_ligne_par_ligne(self):
        f.utilisateur("pris@paositra.mg", employe=self.rabe)
        rapport = self.importer(("x@paositra.mg", "9999"), ("pas-une-adresse", "8101"), ("pris@paositra.mg", "8101"),
                                ("ok@paositra.mg", "8101")).data
        messages = [d["message"] for d in rapport["details"]]
        self.assertEqual((rapport["lignes_erreur"], rapport["lignes_creees"]), (3, 1))
        self.assertIn("Aucun employé avec le matricule « 9999 »", messages[0])
        self.assertIn("invalide", messages[1])
        self.assertIn("déjà le compte de", messages[2])

    def test_meme_adresse_deux_fois_dans_le_fichier(self):
        rapport = self.importer(("double@paositra.mg", "8101"), ("double@paositra.mg", "8102")).data
        self.assertEqual((rapport["lignes_creees"], rapport["lignes_erreur"]), (1, 1))
        self.assertEqual(Utilisateur.objects.filter(utilisateur_mail="double@paositra.mg").count(), 1)

    def test_entetes_variantes_et_colonne_manquante(self):
        fichier = fichier_excel([{" ADRESSE ELECTRONIQUE ": "a@paositra.mg", "MLE": "8101"}])
        rapport = self.client.post(URL, {"fichier": fichier, "dry_run": "true"}).data
        self.assertEqual(rapport["lignes_ok"], 1)
        rapport = self.client.post(URL, {"fichier": fichier_excel([{"Matricule": "8101"}]), "dry_run": "true"}).data
        self.assertEqual(rapport["colonnes_manquantes"], ["Adresse électronique"])

    def test_reserve_a_la_gestion_des_utilisateurs(self):
        autre = client_pour(f.utilisateur("cat@test.mg", [a.CAT_GERE]))
        reponse = autre.post(URL, {"fichier": fichier_excel(lignes(("x@paositra.mg", "8101"))), "dry_run": "true"})
        self.assertEqual(reponse.status_code, 403)
        self.assertFalse(Employer.objects.filter(emp_utilisateur_id__utilisateur_mail="x@paositra.mg").exists())
