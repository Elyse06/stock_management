import re
import time
from datetime import timedelta
from unittest.mock import patch

from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.common import actions as a
from apps.notifications.tasks import envoyer_acces_compte
from apps.utilisateur.acces import preparer_sans_mot_de_passe
from apps.utilisateur.models import Utilisateur

from . import factories as f
from .test_securite import client_pour

URL = "/api/utilisateur/utilisateurs/"


def jeton_envoye(message):
    return re.search(r"/activation#(\S+)", message.body).group(1)


def verifier(jeton):
    return APIClient().post("/api/auth/activation/verifier/", {"jeton": jeton}, format="json")


def activer(jeton, nouveau="Mon-Secret-Tahiry-26"):
    return APIClient().post("/api/auth/activation/", {"jeton": jeton, "nouveau": nouveau}, format="json")


def connexion(email, mdp):
    return APIClient().post("/api/auth/login/", {"utilisateur_mail": email, "password": mdp}, format="json")


@override_settings(APP_URL="https://tahiry.paositra.mg", ACTIVATION_DUREE_HEURES=72)
class LienActivationTests(TestCase):
    def setUp(self):
        self.admin = client_pour(f.utilisateur("admin@test.mg", [a.USR_GERE]))
        self.rakoto = f.employe("8101")

    def creer(self, **donnees):
        with self.captureOnCommitCallbacks(execute=True):
            reponse = self.admin.post(URL, {"utilisateur_mail": "jean@paositra.mg", "actions": [], **donnees}, format="json")
        self.assertEqual(reponse.status_code, 201, reponse.data)
        return Utilisateur.objects.get(utilisateur_mail="jean@paositra.mg")

    def test_e_mail_avec_lien_et_sans_mot_de_passe(self):
        compte = self.creer(emp_id=self.rakoto.pk)
        message = mail.outbox[0]
        self.assertEqual((message.to, message.subject), (["jean@paositra.mg"], "Activez votre compte Tahiry"))
        self.assertTrue(message.body.startswith(f"Bonjour {self.rakoto.emp_nom},\n"))
        self.assertIn("https://tahiry.paositra.mg/activation#", message.body)
        self.assertIn("72 heures", message.body)
        self.assertNotIn("mot de passe temporaire", message.body)
        compte.refresh_from_db()
        self.assertTrue(compte.mdp_a_changer)
        self.assertIsNotNone(compte.acces_envoye_le)

    def test_verification_puis_activation(self):
        self.creer(emp_id=self.rakoto.pk)
        jeton = jeton_envoye(mail.outbox[0])
        reponse = verifier(jeton)
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.data, {"utilisateur_mail": "jean@paositra.mg", "nom": self.rakoto.emp_nom})
        self.assertEqual(activer(jeton, "12345678").status_code, 400)  # règles de robustesse appliquées
        reponse = activer(jeton)
        self.assertEqual(reponse.status_code, 200)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {reponse.data['access']}")
        self.assertFalse(client.get("/api/auth/me/").data["mdp_a_changer"])  # connecté, compte activé
        self.assertEqual(connexion("jean@paositra.mg", "Mon-Secret-Tahiry-26").status_code, 200)

    def test_lien_a_usage_unique(self):
        self.creer()
        jeton = jeton_envoye(mail.outbox[0])
        self.assertEqual(activer(jeton).status_code, 200)
        reponse = activer(jeton, "Autre-Secret-Tahiry-26")
        self.assertEqual(reponse.status_code, 400)
        self.assertIn("déjà été utilisé", reponse.data["detail"])
        self.assertEqual(connexion("jean@paositra.mg", "Autre-Secret-Tahiry-26").status_code, 401)

    def test_lien_remplace_par_un_renvoi(self):
        compte = self.creer()
        ancien = jeton_envoye(mail.outbox[0])
        with self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(self.admin.post(f"{URL}{compte.pk}/renvoyer-acces/").status_code, 202)
        nouveau = jeton_envoye(mail.outbox[1])
        self.assertEqual(verifier(ancien).status_code, 400)
        self.assertEqual(verifier(nouveau).status_code, 200)

    def test_lien_expire(self):
        self.creer()
        jeton = jeton_envoye(mail.outbox[0])
        plus_tard = time.time() + 73 * 3600
        with patch("django.core.signing.time.time", return_value=plus_tard):
            reponse = verifier(jeton)
        self.assertEqual(reponse.status_code, 400)
        self.assertIn("expiré", reponse.data["detail"])

    def test_lien_altere(self):
        self.creer()
        jeton = jeton_envoye(mail.outbox[0])
        self.assertEqual(verifier(jeton[:-2] + "xy").status_code, 400)
        self.assertEqual(verifier("").status_code, 400)

    def test_liste_signale_les_liens_expires(self):
        compte = self.creer()
        Utilisateur.objects.filter(pk=compte.pk).update(acces_envoye_le=timezone.now() - timedelta(hours=73))
        ligne = next(u for u in self.admin.get(URL).data["results"] if u["utilisateur_id"] == compte.pk)
        self.assertTrue(ligne["acces_expire"])

    def test_creation_avec_mot_de_passe_saisi_sans_envoi(self):
        compte = self.creer(utilisateur_mdp="Mot-de-passe-Choisi-26")
        self.assertEqual(mail.outbox, [])
        self.assertFalse(compte.mdp_a_changer)

    def test_aucune_connexion_possible_avant_activation(self):
        compte = Utilisateur(utilisateur_mail="attente@paositra.mg")
        preparer_sans_mot_de_passe(compte)
        compte.save()
        for essai in ("0000", "None", compte.utilisateur_mdp):
            self.assertEqual(connexion("attente@paositra.mg", essai).status_code, 401, essai)

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
