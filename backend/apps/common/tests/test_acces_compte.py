import re
from unittest.mock import patch

from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.common import actions as a
from apps.notifications.tasks import envoyer_acces_compte
from apps.utilisateur.acces import preparer_sans_mot_de_passe
from apps.utilisateur.models import Utilisateur

from . import factories as f
from .test_securite import client_pour

URL = "/api/utilisateur/utilisateurs/"


def mot_de_passe_envoye(message):
    return re.search(r"mot de passe temporaire (\S+) ;", message.body).group(1)


def connexion(email, mdp):
    return APIClient().post("/api/auth/login/", {"utilisateur_mail": email, "password": mdp}, format="json")


@override_settings(APP_URL="https://tahiry.paositra.mg")
class AccesCompteTests(TestCase):
    def setUp(self):
        self.admin = client_pour(f.utilisateur("admin@test.mg", [a.USR_GERE]))
        self.rakoto = f.employe("8101")

    def creer(self, **donnees):
        with self.captureOnCommitCallbacks(execute=True):
            reponse = self.admin.post(URL, {"utilisateur_mail": "jean@paositra.mg", "actions": [], **donnees}, format="json")
        self.assertEqual(reponse.status_code, 201, reponse.data)
        return Utilisateur.objects.get(utilisateur_mail="jean@paositra.mg")

    def test_creation_sans_mot_de_passe_envoie_l_acces(self):
        compte = self.creer(emp_id=self.rakoto.pk)
        message = mail.outbox[0]
        self.assertEqual((message.to, message.subject), (["jean@paositra.mg"], "Votre accès à Tahiry"))
        self.assertTrue(message.body.startswith(f"Bonjour {self.rakoto.emp_nom},\n"))
        self.assertIn("https://tahiry.paositra.mg/login", message.body)
        compte.refresh_from_db()
        self.assertTrue(compte.mdp_a_changer)
        self.assertIsNotNone(compte.acces_envoye_le)
        reponse = connexion("jean@paositra.mg", mot_de_passe_envoye(message))
        self.assertEqual((reponse.status_code, reponse.data["mdp_a_changer"]), (200, True))

    def test_creation_avec_mot_de_passe_saisi_sans_envoi(self):
        compte = self.creer(utilisateur_mdp="Mot-de-passe-Choisi-26")
        self.assertEqual(mail.outbox, [])
        self.assertFalse(compte.mdp_a_changer)

    def test_aucune_connexion_possible_avant_l_envoi(self):
        compte = Utilisateur(utilisateur_mail="attente@paositra.mg")
        preparer_sans_mot_de_passe(compte)
        compte.save()
        self.assertEqual(connexion("attente@paositra.mg", "").status_code, 400)
        for essai in ("0000", "None", compte.utilisateur_mdp):
            self.assertEqual(connexion("attente@paositra.mg", essai).status_code, 401, essai)

    def test_renvoyer_l_acces(self):
        compte = self.creer()
        premier = mot_de_passe_envoye(mail.outbox[0])
        with self.captureOnCommitCallbacks(execute=True):
            reponse = self.admin.post(f"{URL}{compte.pk}/renvoyer-acces/")
        self.assertEqual(reponse.status_code, 202)
        second = mot_de_passe_envoye(mail.outbox[1])
        self.assertNotEqual(premier, second)
        self.assertEqual(connexion("jean@paositra.mg", premier).status_code, 401)  # l'ancien ne fonctionne plus
        self.assertEqual(connexion("jean@paositra.mg", second).status_code, 200)

    def test_renvoi_refuse_pour_un_compte_active_ou_sans_droit(self):
        actif = f.utilisateur("actif@paositra.mg")
        self.assertEqual(self.admin.post(f"{URL}{actif.pk}/renvoyer-acces/").status_code, 400)
        autre = client_pour(f.utilisateur("cat@test.mg", [a.CAT_GERE]))
        self.assertEqual(autre.post(f"{URL}{actif.pk}/renvoyer-acces/").status_code, 403)

    def test_tache_sans_effet_sur_un_compte_deja_active(self):
        actif = f.utilisateur("actif@paositra.mg")
        self.assertEqual(envoyer_acces_compte.apply(args=(actif.pk,)).result, "Compte déjà activé")
        self.assertEqual(mail.outbox, [])

    def test_echec_d_envoi_nouvelle_tentative(self):
        compte = Utilisateur(utilisateur_mail="echec@paositra.mg")
        preparer_sans_mot_de_passe(compte)
        compte.save()
        with patch("apps.notifications.tasks.acces_compte.envoyer_notification", side_effect=OSError("SMTP indisponible")), \
             patch.object(envoyer_acces_compte, "retry", side_effect=RuntimeError("nouvelle tentative programmée")):
            resultat = envoyer_acces_compte.apply(args=(compte.pk,))
        self.assertIn("nouvelle tentative", str(resultat.result))
        compte.refresh_from_db()
        self.assertIsNone(compte.acces_envoye_le)
