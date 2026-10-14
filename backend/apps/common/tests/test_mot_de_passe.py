from django.contrib.auth.hashers import make_password
from django.test import TestCase
from rest_framework.test import APIClient

from apps.common import actions as a
from apps.utilisateur.models import Utilisateur

from . import factories as f

URL = "/api/auth/changer-mot-de-passe/"


def connecter(email, mdp):
    client = APIClient()
    jetons = client.post("/api/auth/login/", {"utilisateur_mail": email, "password": mdp}, format="json").data
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {jetons['access']}")
    return client, jetons


class MotDePasseTemporaireTests(TestCase):
    def setUp(self):
        self.compte = f.utilisateur("nouveau@paositra.mg", [a.CAT_LIRE, a.COM_DEM])
        Utilisateur.objects.filter(pk=self.compte.pk).update(utilisateur_mdp=make_password("0000"), mdp_a_changer=True)
        self.client, self.jetons = connecter("nouveau@paositra.mg", "0000")

    def test_tout_est_bloque_sauf_le_profil_et_le_changement(self):
        self.assertTrue(self.jetons["mdp_a_changer"])
        for adresse in ("/api/catalogue/articles/", "/api/commandes/commandes/", "/api/dashboard/kpis/"):
            reponse = self.client.get(adresse)
            self.assertEqual(reponse.status_code, 403, adresse)
            self.assertEqual(reponse.data["code"], "mot_de_passe_a_changer")
        me = self.client.get("/api/auth/me/")
        self.assertEqual((me.status_code, me.data["mdp_a_changer"]), (200, True))

    def test_controles_du_nouveau_mot_de_passe(self):
        cas = [
            ({"ancien": "faux", "nouveau": "Tahiry-2026!"}, "ancien"),
            ({"ancien": "0000", "nouveau": "0000"}, "nouveau"),         # identique
            ({"ancien": "0000", "nouveau": "12345678"}, "nouveau"),     # uniquement des chiffres
            ({"ancien": "0000", "nouveau": "password"}, "nouveau"),     # mot de passe courant
            ({"ancien": "0000", "nouveau": "Ab1!"}, "nouveau"),         # trop court
        ]
        for donnees, champ in cas:
            reponse = self.client.post(URL, donnees, format="json")
            self.assertEqual(reponse.status_code, 400, donnees)
            self.assertIn(champ, reponse.data, donnees)
        self.compte.refresh_from_db()
        self.assertTrue(self.compte.mdp_a_changer)

    def test_changement_reussi(self):
        reponse = self.client.post(URL, {"ancien": "0000", "nouveau": "Tahiry-Paositra-26"}, format="json")
        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.compte.refresh_from_db()
        self.assertFalse(self.compte.mdp_a_changer)
        # L'ancien jeton est révoqué, le nouveau donne accès à l'application.
        self.assertEqual(self.client.get("/api/catalogue/articles/").status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {reponse.data['access']}")
        self.assertEqual(self.client.get("/api/catalogue/articles/").status_code, 200)
        # « 0000 » ne fonctionne plus, le nouveau mot de passe oui.
        self.assertEqual(APIClient().post("/api/auth/login/", {"utilisateur_mail": "nouveau@paositra.mg", "password": "0000"},
                                          format="json").status_code, 401)
        self.assertFalse(connecter("nouveau@paositra.mg", "Tahiry-Paositra-26")[1]["mdp_a_changer"])

    def test_un_utilisateur_ordinaire_peut_changer_son_mot_de_passe(self):
        ordinaire = f.utilisateur("ordinaire@paositra.mg", [a.CAT_LIRE])
        client, _ = connecter("ordinaire@paositra.mg", f.MOT_DE_PASSE)
        self.assertEqual(client.get("/api/catalogue/articles/").status_code, 200)  # pas de blocage sans mot de passe temporaire
        reponse = client.post(URL, {"ancien": f.MOT_DE_PASSE, "nouveau": "Nouveau-Secret-2026"}, format="json")
        self.assertEqual(reponse.status_code, 200)
        ordinaire.refresh_from_db()
        self.assertFalse(ordinaire.mdp_a_changer)

    def test_sans_connexion(self):
        self.assertEqual(APIClient().post(URL, {"ancien": "0000", "nouveau": "Tahiry-2026!"}, format="json").status_code, 401)
