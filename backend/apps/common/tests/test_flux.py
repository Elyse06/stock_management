from io import BytesIO

import pandas as pd
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from apps.commande.models import AttributionDetailCommande, Commande, DetailCommande
from apps.common import actions as a
from apps.common.stock import stock_article_magasin
from apps.employee.models import Employer
from apps.notifications.tasks import (
    notifier_changement_statut_commande,
    notifier_stock_bas,
)
from apps.stock.models import (
    Affectation,
    InventaireSession,
    LigneInventaire,
    Mouvement,
    UniteArticle,
)

from . import factories as f
from .test_securite import client_pour


def fichier_excel(lignes, nom="import.xlsx"):
    tampon = BytesIO()
    pd.DataFrame(lignes).to_excel(tampon, index=False)
    return SimpleUploadedFile(nom, tampon.getvalue())


class WorkflowCommandeTests(TestCase):
    def setUp(self):
        self.dir_ = f.direction()
        self.demandeur = f.employe("D", self.dir_)
        self.chef = f.employe("C", self.dir_)
        self.gest = f.employe("G", self.dir_)
        self.c_dem = client_pour(f.utilisateur("dem@test.mg", [a.COM_DEM], employe=self.demandeur))
        self.c_chef = client_pour(f.utilisateur("chef@test.mg", [a.COM_DEM, a.COM_VAL], employe=self.chef))
        self.c_gest = client_pour(
            f.utilisateur("gest@test.mg", [a.COM_DEM, a.COM_VAL, a.CAT_GERE], employe=self.gest)
        )
        self.magasin = f.magasin()
        self.article = f.article(immobilisation=True)
        f.mouvement(Mouvement.Type.ENTREE, self.article, 3, destination=self.magasin)
        UniteArticle.objects.bulk_create([UniteArticle(article=self.article) for _ in range(3)])

    def test_flux_complet(self):
        reponse = self.c_dem.post("/api/commandes/commandes/", {
            "objet": "Postes",
            "details": [{"article": self.article.pk, "quantite": 2, "attributions": [
                {"employe_beneficiaire": self.demandeur.pk, "quantite": 2, "quantite_demandee": 2,
                 "statut": "VALIDEE", "quantite_validee": 2},
            ]}],
        }, format="json")
        self.assertEqual(reponse.status_code, 201, reponse.data)
        commande_id = reponse.data["commande_id"]
        attribution = AttributionDetailCommande.objects.get()
        # Le demandeur ne peut pas pré-valider lui-même son attribution.
        self.assertEqual(attribution.statut, "EN_ATTENTE")
        self.assertIsNone(attribution.quantite_validee)

        url = f"/api/commandes/commandes/{commande_id}/traiter/"
        self.assertEqual(self.c_dem.post(url, {"statut": "EN_COURS"}, format="json").status_code, 403)
        self.assertEqual(self.c_chef.post(url, {"statut": "VALIDEE"}, format="json").status_code, 400)

        reponse = self.c_chef.post(url, {"statut": "EN_COURS"}, format="json")
        self.assertEqual(reponse.status_code, 200, reponse.data)
        reponse = self.c_gest.post(url, {
            "statut": "VALIDEE", "magasin_source": self.magasin.pk,
            "validations": [{"attribution_id": attribution.pk, "statut": "VALIDEE", "quantite_validee": 2}],
        }, format="json")
        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.assertEqual(reponse.data["statut"], "VALIDEE")
        self.assertEqual(stock_article_magasin(self.article, self.magasin.pk), 1)
        self.assertEqual(UniteArticle.objects.filter(statut="ATTRIBUE").count(), 2)
        # Une seconde validation est refusée (pas de double sortie de stock).
        self.assertEqual(self.c_gest.post(url, {"statut": "VALIDEE", "magasin_source": self.magasin.pk},
                                          format="json").status_code, 400)

    def test_validation_d_une_attribution_etrangere_refusee(self):
        autre = Commande.objects.create(employe_demandeur=self.demandeur)
        detail = DetailCommande.objects.create(commande=autre, article=self.article, quantite=1)
        etrangere = AttributionDetailCommande.objects.create(
            detail_commande=detail, affectation=Affectation.pour_employe(self.demandeur), quantite=1,
        )
        commande = Commande.objects.create(employe_demandeur=self.demandeur)
        reponse = self.c_chef.post(f"/api/commandes/commandes/{commande.pk}/traiter/", {
            "statut": "REJETEE",
            "validations": [{"attribution_id": etrangere.pk, "statut": "REFUSEE", "motif_refus": "x"}],
        }, format="json")
        self.assertEqual(reponse.status_code, 400)
        etrangere.refresh_from_db()
        self.assertEqual(etrangere.statut, "EN_ATTENTE")

    def test_notification_echappe_le_html(self):
        Employer.objects.filter(pk=self.demandeur.pk).update(emp_nom="<script>x</script>")
        commande = Commande.objects.create(employe_demandeur=self.demandeur, objet="<b>objet</b>")
        Commande.objects.filter(pk=commande.pk).update(statut=Commande.Statut.EN_COURS)
        notifier_changement_statut_commande.apply(args=(commande.pk, "EN_ATTENTE", "EN_COURS"))
        self.assertEqual(len(mail.outbox), 2)
        html = "".join(m.alternatives[0][0] for m in mail.outbox)
        self.assertNotIn("<script>", html)
        self.assertIn("&lt;b&gt;objet&lt;/b&gt;", html)

    def test_alerte_stock_bas(self):
        article = f.article("ART9", seuil=5)
        f.mouvement(Mouvement.Type.ENTREE, article, 2, destination=self.magasin)
        notifier_stock_bas.apply(kwargs={"code_article": article.pk, "magasin_id": self.magasin.pk})
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(sorted(mail.outbox[0].to), ["gest@test.mg"])


class UnitesTests(TestCase):
    def setUp(self):
        self.client = client_pour(f.utilisateur("inv@test.mg", [a.INV_GERE, a.INV_LIRE, a.CAT_LIRE, a.MOV_LIRE]))
        self.magasin = f.magasin()
        self.dir_ = f.direction()

    def test_entree_sortie_retour_transfert(self):
        article = f.article("PC", immobilisation=True)
        article.mode_suivi = "NUMERO_SERIE"
        article.save()
        reponse = self.client.post("/api/stock/mouvements/", {
            "type_mouvement": "ENTREE", "magasin_destination": self.magasin.pk,
            "details": [{"article": "PC", "quantite": 2, "numeros_de_serie": ["S1", "S2"]}],
        }, format="json")
        self.assertEqual(reponse.status_code, 201, reponse.data)

        # Sortie sans bénéficiaire : erreur 400 claire (auparavant 500).
        reponse = self.client.post("/api/stock/mouvements/", {
            "type_mouvement": "SORTIE", "magasin_source": self.magasin.pk,
            "details": [{"article": "PC", "quantite": 1, "numeros_de_serie": ["S1"]}],
        }, format="json")
        self.assertEqual(reponse.status_code, 400)

        reponse = self.client.post("/api/stock/mouvements/", {
            "type_mouvement": "SORTIE", "magasin_source": self.magasin.pk,
            "details": [{"article": "PC", "quantite": 1, "numeros_de_serie": ["S1"],
                         "direction_beneficiaire": self.dir_.pk}],
        }, format="json")
        self.assertEqual(reponse.status_code, 201, reponse.data)
        unite = UniteArticle.objects.get(numero_de_serie="S1")
        self.assertEqual(unite.statut, "ATTRIBUE")

        detail = self.client.get(f"/api/stock/mouvements/{reponse.data['mouvement_id']}/")
        self.assertEqual(detail.status_code, 200)

        autre = f.direction("DAF")
        reponse = self.client.post(f"/api/stock/unites-article/{unite.pk}/transferer/", {
            "nouvelle_direction_beneficiaire": autre.pk, "magasin_source": self.magasin.pk,
        }, format="json")
        self.assertEqual(reponse.status_code, 200, reponse.data)
        unite.refresh_from_db()
        self.assertEqual(unite.affectation.direction, autre)

        reponse = self.client.post(f"/api/stock/unites-article/{unite.pk}/retourner-stock/", {
            "magasin_destination": self.magasin.pk,
        }, format="json")
        self.assertEqual(reponse.status_code, 200, reponse.data)
        unite.refresh_from_db()
        self.assertEqual(unite.statut, "EN_STOCK")
        self.assertEqual(stock_article_magasin(article, self.magasin.pk), 2)

        self.assertEqual(self.client.get(f"/api/stock/magasins/{self.magasin.pk}/stocks/").data["PC"]["stock_theorique"], 2)
        self.assertEqual(self.client.get(
            f"/api/stock/unites-article/?localisation_direction_id={autre.pk}").data["count"], 0)

    def test_suppression_protegee_renvoie_409(self):
        article = f.article("A1")
        f.mouvement(Mouvement.Type.ENTREE, article, 1, destination=self.magasin)
        client = client_pour(f.utilisateur("cat@test.mg", [a.CAT_LIRE, a.CAT_GERE]))
        self.assertEqual(client.delete("/api/catalogue/articles/A1/").status_code, 409)

    def test_inventaire_valide_verrouille(self):
        article = f.article("A2")
        f.mouvement(Mouvement.Type.ENTREE, article, 5, destination=self.magasin)
        reponse = self.client.post("/api/stock/inventaires/", {
            "magasin": self.magasin.pk, "lignes": [{"article": "A2", "quantite_physique": 3}],
        }, format="json")
        self.assertEqual(reponse.status_code, 201, reponse.data)
        session = InventaireSession.objects.get()
        self.assertEqual(LigneInventaire.objects.get().quantite_theorique, 5)

        validateur = client_pour(f.utilisateur("val@test.mg", [a.INV_VAL, a.INV_LIRE]))
        self.assertEqual(validateur.post(f"/api/stock/inventaires/{session.pk}/valider/").status_code, 200)
        self.assertEqual(stock_article_magasin(article, self.magasin.pk), 3)
        self.assertEqual(validateur.post(f"/api/stock/inventaires/{session.pk}/valider/").status_code, 400)
        self.assertEqual(self.client.delete(f"/api/stock/inventaires/{session.pk}/").status_code, 400)


class ImportsTests(TestCase):
    def setUp(self):
        self.client = client_pour(f.utilisateur("cat@test.mg", [a.CAT_GERE, a.USR_GERE]))
        self.siege = f.siege()
        self.magasin = f.magasin("SIEGE", self.siege)

    def test_fichier_deguise_refuse(self):
        faux = SimpleUploadedFile("virus.xlsx", b"MZ\x90\x00 pas un classeur")
        reponse = self.client.post("/api/stock/import-fournitures/", {"fichier": faux})
        self.assertEqual(reponse.status_code, 400)

    def test_import_fournitures(self):
        fichier = fichier_excel([
            {"ARTICLES": "Crayon", "QTE RESTANT": 4, "OBSERVATION": ""},
            {"ARTICLES": "Gomme", "QTE RESTANT": -1, "OBSERVATION": ""},
        ])
        reponse = self.client.post("/api/stock/import-fournitures/", {"fichier": fichier, "dry_run": "false"})
        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.assertEqual((reponse.data["lignes_ok"], reponse.data["lignes_erreur"]), (1, 1))
        self.assertEqual(reponse.data["ligne_entete_utilisee"], 1)

    def test_import_immobilisations_dry_run_puis_reel(self):
        direction = f.direction("Direction des Systèmes")
        lignes = [
            {"Date D'acquisition": "2026-01-01", "nature": "Laptop", "famille": "INFO",
             "Agence": "", "Affectation": "Direction des Systèmes", "Fournisseur": "Dell"},
            {"Date D'acquisition": "2026-01-01", "nature": "Chaise", "famille": "MOB",
             "Agence": "", "Affectation": "", "Fournisseur": ""},
        ]
        reponse = self.client.post("/api/stock/import-immobilisations/", {"fichier": fichier_excel(lignes)})
        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.assertEqual((reponse.data["lignes_ok"], reponse.data["lignes_a_traiter"]), (1, 1))
        self.assertFalse(UniteArticle.objects.exists())

        reponse = self.client.post("/api/stock/import-immobilisations/", {
            "fichier": fichier_excel(lignes), "dry_run": "false", "lignes_confirmees": "[2]",
        })
        self.assertEqual(reponse.data["lignes_ok"], 2)
        self.assertEqual(UniteArticle.objects.filter(affectation__direction=direction).count(), 1)

    def test_import_employes(self):
        fichier = fichier_excel([
            {"Mle": "100", "Nom et prénoms": "Rabe", "Direction": "Direction Finance",
             "Fonction": "Agent", "Lieu de Travail": "Tana", "Affectation": "SIEGE"},
            {"Mle": "101", "Nom et prénoms": "Rakoto", "Direction": "Direction Finance",
             "Fonction": "Agent", "Lieu de Travail": "Tana", "Affectation": "SIEGE"},
        ])
        reponse = self.client.post("/api/employee/employee/import/", {"fichier": fichier, "dry_run": "false"})
        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.assertEqual(reponse.data["lignes_creees"], 2)
        sites = set(Employer.objects.values_list("emp_site_id__site_nom", flat=True))
        self.assertEqual(sites, {"SIEGE"})
