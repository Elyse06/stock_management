from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.ai.search import nettoyer_filtres
from apps.auth.tokens import generer_tokens
from apps.commande.models import Commande
from apps.common import actions as a

from . import factories as f


def client_pour(user):
    client = APIClient()
    access, _ = generer_tokens(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    return client


class AuthentificationTests(TestCase):
    def test_login_puis_acces(self):
        f.utilisateur("a@test.mg", [a.CAT_LIRE])
        reponse = APIClient().post(
            "/api/auth/login/", {"utilisateur_mail": "a@test.mg", "password": f.MOT_DE_PASSE}, format="json"
        )
        self.assertEqual(reponse.status_code, 200)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {reponse.data['access']}")
        me = client.get("/api/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["actions"], [a.CAT_LIRE])

    def test_identifiants_invalides(self):
        f.utilisateur("a@test.mg")
        for email in ("a@test.mg", "inconnu@test.mg"):
            reponse = APIClient().post(
                "/api/auth/login/", {"utilisateur_mail": email, "password": "mauvais"}, format="json"
            )
            self.assertEqual(reponse.status_code, 401)

    def test_changement_de_mot_de_passe_revoque_les_jetons(self):
        user = f.utilisateur("a@test.mg")
        client = client_pour(user)
        self.assertEqual(client.get("/api/auth/me/").status_code, 200)
        user.utilisateur_mdp = "autre-hash"
        user.save()
        self.assertEqual(client.get("/api/auth/me/").status_code, 401)

    def test_refresh_refuse_un_access_token(self):
        access, refresh = generer_tokens(f.utilisateur("a@test.mg"))
        self.assertEqual(APIClient().post("/api/auth/refresh/", {"refresh": access}, format="json").status_code, 401)
        self.assertEqual(APIClient().post("/api/auth/refresh/", {"refresh": refresh}, format="json").status_code, 200)


class EscaladePrivilegesTests(TestCase):
    def test_utilisateur_standard_ne_peut_pas_gerer_les_comptes(self):
        client = client_pour(f.utilisateur("std@test.mg", [a.CAT_LIRE, a.COM_DEM]))
        self.assertEqual(client.get("/api/utilisateur/utilisateurs/").status_code, 403)
        self.assertEqual(client.post("/api/utilisateur/autorisations/", {}, format="json").status_code, 403)

    def test_admin_ne_peut_pas_se_retirer_la_gestion(self):
        admin = f.utilisateur("admin@test.mg", [a.USR_GERE])
        reponse = client_pour(admin).patch(
            f"/api/utilisateur/utilisateurs/{admin.pk}/", {"actions": [a.CAT_LIRE]}, format="json"
        )
        self.assertEqual(reponse.status_code, 400)

    def test_mot_de_passe_faible_refuse(self):
        f.utilisateur("cat@test.mg", [a.CAT_LIRE])
        reponse = client_pour(f.utilisateur("admin@test.mg", [a.USR_GERE])).post(
            "/api/utilisateur/utilisateurs/",
            {"utilisateur_mail": "n@test.mg", "utilisateur_mdp": "Admin"}, format="json",
        )
        self.assertEqual(reponse.status_code, 400)

    def test_liste_utilisateurs_sans_n_plus_un(self):
        admin = f.utilisateur("admin@test.mg", [a.USR_GERE])
        for i in range(5):
            f.utilisateur(f"u{i}@test.mg", [a.CAT_LIRE], employe=f.employe(f"M{i}", f.direction(f"D{i}")))
        client = client_pour(admin)
        with self.assertNumQueries(7):
            self.assertEqual(client.get("/api/utilisateur/utilisateurs/").status_code, 200)


class CommandeAccesTests(TestCase):
    def setUp(self):
        self.dir_ = f.direction()
        self.alice = f.employe("A", self.dir_)
        self.bob = f.employe("B", self.dir_)
        self.client_alice = client_pour(f.utilisateur("alice@test.mg", [a.COM_DEM], employe=self.alice))
        self.client_bob = client_pour(f.utilisateur("bob@test.mg", [a.COM_DEM], employe=self.bob))
        self.commande_bob = Commande.objects.create(employe_demandeur=self.bob, objet="Écran")

    def test_un_demandeur_ne_voit_ni_ne_modifie_la_commande_d_un_autre(self):
        url = f"/api/commandes/commandes/{self.commande_bob.pk}/"
        self.assertEqual(self.client_alice.get(url).status_code, 404)
        self.assertEqual(self.client_alice.patch(url, {"objet": "x"}, format="json").status_code, 404)
        self.assertEqual(self.client_alice.delete(url).status_code, 404)
        self.assertTrue(Commande.objects.filter(pk=self.commande_bob.pk).exists())

    def test_le_statut_ne_peut_pas_etre_force(self):
        url = f"/api/commandes/commandes/{self.commande_bob.pk}/"
        self.client_bob.patch(url, {"statut": "VALIDEE"}, format="json")
        self.commande_bob.refresh_from_db()
        self.assertEqual(self.commande_bob.statut, Commande.Statut.EN_ATTENTE)

    def test_commande_traitee_non_modifiable(self):
        Commande.objects.filter(pk=self.commande_bob.pk).update(statut=Commande.Statut.VALIDEE)
        reponse = self.client_bob.delete(f"/api/commandes/commandes/{self.commande_bob.pk}/")
        self.assertEqual(reponse.status_code, 400)

    def test_utilisateur_sans_employe_ne_voit_rien(self):
        client = client_pour(f.utilisateur("orphelin@test.mg", [a.COM_DEM]))
        self.assertEqual(client.get("/api/commandes/commandes/").data["count"], 0)

    def test_creation_pour_un_autre_refusee(self):
        reponse = self.client_alice.post(
            "/api/commandes/commandes/", {"objet": "x", "employe_demandeur": self.bob.pk}, format="json"
        )
        self.assertEqual(reponse.status_code, 400)

    def test_recapitulatif(self):
        reponse = self.client_bob.get(f"/api/commandes/commandes/{self.commande_bob.pk}/recapitulatif/")
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.data["total_lignes"], 0)


class FiltresIATests(TestCase):
    def test_relations_et_champs_sensibles_rejetes(self):
        valides, ignores = nettoyer_filtres({
            "designation__icontains": "écran",
            "stock_calcule__gte": "10",
            "details_commande__commande__employe_demandeur__emp_utilisateur_id__utilisateur_mdp__startswith": "p",
            "categorie__articles__code_article": "x",
            "is_immobilisation": "oui",
            "mode_suivi": "INEXISTANT",
        })
        self.assertEqual(valides, {"designation__icontains": "écran", "stock_calcule__gte": 10})
        self.assertEqual(len(ignores), 4)


class DroitsLectureTests(TestCase):
    def test_historique_et_dashboard_exigent_des_droits(self):
        client = client_pour(f.utilisateur("rien@test.mg"))
        for url in ("/api/historique/globale/", "/api/dashboard/kpis/", "/api/dashboard/evolution-stock/"):
            self.assertEqual(client.get(url).status_code, 403, url)

    def test_dashboard_fonctionne(self):
        art = f.article(seuil=5)
        m = f.magasin()
        f.mouvement("ENTREE", art, 3, destination=m)
        client = client_pour(f.utilisateur("cat@test.mg", [a.CAT_LIRE, a.MOV_LIRE]))
        kpis = client.get("/api/dashboard/kpis/").data
        self.assertEqual(kpis["total_articles"], 1)
        self.assertEqual(kpis["total_stock"], 3)
        self.assertEqual(kpis["produits_sous_seuil"], 1)
        self.assertEqual(kpis["produits_en_rupture"], 0)
        for url in (
            "/api/dashboard/evolution-stock/", "/api/dashboard/repartition-magasin/",
            "/api/dashboard/repartition-categorie/", "/api/dashboard/kpis/sous-seuil/",
            "/api/dashboard/kpis/entrees-mois/?mois=2026-10", "/api/dashboard/kpis/sorties-mois/",
            "/api/dashboard/kpis/ruptures/", "/api/dashboard/kpis/articles/?page_size=1000",
            "/api/dashboard/top-consommes/", "/api/dashboard/produits-dormants/",
            "/api/dashboard/consommation-mensuelle/", "/api/historique/globale/",
            f"/api/historique/article/{art.pk}/", f"/api/historique/article/{art.pk}/export/",
            f"/api/catalogue/articles/{art.pk}/fiche-complete/", "/api/catalogue/articles/",
        ):
            self.assertEqual(client.get(url).status_code, 200, url)
        self.assertEqual(client.get("/api/dashboard/repartition-magasin/").data, [{"magasin": "Central", "stock": 3}])
        self.assertEqual(client.get("/api/dashboard/evolution-stock/").data[-1]["stock_total"], 3)
        self.assertEqual(client.get("/api/dashboard/kpis/entrees-mois/?mois=13-2026").status_code, 400)

    @override_settings(DEBUG=False)
    def test_endpoint_de_test_absent_hors_debug(self):
        client = client_pour(f.utilisateur("inv@test.mg", [a.INV_GERE]))
        self.assertEqual(client.post("/api/notifications/test-alerte-stock/", {}).status_code, 404)
