from django.core import mail
from rest_framework.test import APIClient

from apps.common import actions as a
from apps.employee.models import Employer
from apps.stock.models import DemandeUnite, Magasin, Salle, UniteArticle

from . import factories as f
from .test_unites import _UnitesBase

DEMANDES = "/api/stock/demandes-unites/"


def client(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


class DemandesUnitesTests(_UnitesBase):
    def setUp(self):
        super().setUp()
        self.magasin = Magasin.objects.get(magasin_nom="Central")
        self.dsi, self.dex = f.direction("DSI"), f.direction("DEX")
        self.marie, self.paul, self.jean = f.employe("M-1", self.dsi), f.employe("M-2", self.dsi), f.employe("M-3", self.dex)
        Employer.objects.filter(pk=self.marie.pk).update(emp_nom="RABE Marie")
        self.marie.refresh_from_db()
        # Marie et Jean : chefs hiérarchiques (font les demandes) ; Paul : profil standard (consulte seulement).
        chef = [a.COM_DEM, a.COM_VAL]
        self.c_marie = client(f.utilisateur("marie@test.mg", chef, employe=self.marie))
        self.c_paul = client(f.utilisateur("paul@test.mg", [a.COM_DEM], employe=self.paul))
        self.c_jean = client(f.utilisateur("jean@test.mg", chef, employe=self.jean))
        self.gest = f.employe("G-1")
        self.c_gest = client(f.utilisateur("gest@test.mg", [a.INV_GERE, a.CAT_LIRE, a.INV_LIRE], employe=self.gest))
        self.u_marie = self._unite("SN-MARIE", self.marie)
        self.u_dsi = self._unite("SN-DSI", self.dsi)
        self.u_jean = self._unite("SN-JEAN", self.jean)
        self.u_salle = self._unite("SN-SALLE", Salle.objects.create(nom="Salle A", localite=self.siege))

    def demander(self, c, unite, type_demande="RETOUR", **extra):
        with self.captureOnCommitCallbacks(execute=True):
            return c.post(DEMANDES, {"unite_id": unite.pk, "type_demande": type_demande, "motif": "Écran cassé", **extra}, format="json")

    def mes_unites(self, c):
        return {u["numero_de_serie"]: u for u in c.get(f"{DEMANDES}mes-unites/").data["results"]}

    def test_chacun_voit_ses_unites_et_celles_de_sa_direction(self):
        self.assertEqual(sorted(self.mes_unites(self.c_marie)), ["SN-DSI", "SN-MARIE"])
        self.assertTrue(self.mes_unites(self.c_marie)["SN-MARIE"]["a_moi"])
        self.assertFalse(self.mes_unites(self.c_marie)["SN-DSI"]["a_moi"])
        self.assertEqual(sorted(self.mes_unites(self.c_paul)), ["SN-DSI"])
        self.assertEqual(sorted(self.mes_unites(self.c_jean)), ["SN-JEAN"])

    def test_creation_et_notification_des_gestionnaires(self):
        reponse = self.demander(self.c_marie, self.u_marie)
        self.assertEqual(reponse.status_code, 201, reponse.data)
        self.assertEqual((reponse.data["statut"], reponse.data["beneficiaire_actuel"]["nom"]), ("EN_ATTENTE", "RABE Marie"))
        message = next(m for m in mail.outbox if m.to == ["gest@test.mg"])
        self.assertIn("RABE Marie demande le retour en stock", message.body)
        self.assertIn("SN-MARIE", message.body)
        self.assertIn("/inventaire/unites?onglet=demandes", message.body)
        demande = self.mes_unites(self.c_marie)["SN-MARIE"]["demande_en_attente"]
        self.assertEqual((demande["type_demande"], demande["de_moi"]), ("RETOUR", True))

    def _autre_chef_dsi(self):
        return client(f.utilisateur("chef2@test.mg", [a.COM_DEM, a.COM_VAL], employe=f.employe("M-4", self.dsi)))

    def test_seul_le_chef_fait_les_demandes(self):
        self.assertEqual(self.demander(self.c_paul, self.u_dsi).status_code, 403)
        self.assertFalse(self.c_paul.get(f"{DEMANDES}mes-unites/").data["peut_demander"])
        self.assertTrue(self.c_marie.get(f"{DEMANDES}mes-unites/").data["peut_demander"])

    def test_le_chef_couvre_les_employes_de_sa_direction(self):
        u_paul = self._unite("SN-PAUL", self.paul)
        self.assertEqual(sorted(self.mes_unites(self.c_marie)), ["SN-DSI", "SN-MARIE", "SN-PAUL"])
        self.assertEqual(sorted(self.mes_unites(self.c_paul)), ["SN-DSI", "SN-PAUL"])  # Paul : pas les unités de Marie
        self.assertEqual(self.demander(self.c_marie, u_paul).status_code, 201)
        self.assertEqual(self.demander(self.c_jean, self.u_marie).status_code, 400)  # autre direction

    def test_une_seule_demande_en_attente_par_unite(self):
        self.assertEqual(self.demander(self.c_marie, self.u_dsi).status_code, 201)
        reponse = self.demander(self._autre_chef_dsi(), self.u_dsi)  # autre chef de la même direction
        self.assertEqual(reponse.status_code, 400)
        self.assertIn("déjà en attente", str(reponse.data))

    def test_unites_hors_perimetre_refusees(self):
        for unite in (self.u_jean, self.u_salle):
            self.assertEqual(self.demander(self.c_marie, unite).status_code, 400, unite.numero_de_serie)

    def test_regles_des_mouvements_des_la_demande(self):
        self.assertEqual(self.demander(self.c_marie, self.u_marie, "TRANSFERT").status_code, 400)  # sans bénéficiaire
        self.assertEqual(self.demander(self.c_marie, self.u_marie, "TRANSFERT", nouvel_employe_beneficiaire=self.marie.pk).status_code, 400)
        UniteArticle.objects.filter(pk=self.u_marie.pk).update(etat=UniteArticle.Etat.PERDU)
        self.assertEqual(self.demander(self.c_marie, self.u_marie).status_code, 400)
        UniteArticle.objects.filter(pk=self.u_marie.pk).update(etat=UniteArticle.Etat.HORS_USAGE)
        self.assertEqual(self.demander(self.c_marie, self.u_marie, "TRANSFERT", nouvelle_direction_beneficiaire=self.dex.pk).status_code, 400)
        self.assertEqual(self.demander(self.c_marie, self.u_marie).status_code, 201)  # retour d'une unité hors d'usage : permis

    def test_traitement_d_un_retour(self):
        demande_id = self.demander(self.c_marie, self.u_marie).data["demande_id"]
        with self.captureOnCommitCallbacks(execute=True):
            reponse = self.c_gest.post(f"/api/stock/unites-article/{self.u_marie.pk}/retourner-stock/",
                                       {"magasin_destination": self.magasin.pk, "demande_id": demande_id}, format="json")
        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.u_marie.refresh_from_db()
        demande = DemandeUnite.objects.get(pk=demande_id)
        self.assertEqual((self.u_marie.statut, demande.statut, demande.traitant), ("EN_STOCK", "TRAITEE", self.gest))
        self.assertEqual(demande.mouvement_id, reponse.data["mouvement_id"])
        message = next(m for m in mail.outbox if m.to == ["marie@test.mg"])
        self.assertIn("retour en stock", message.body)
        self.assertIn("a été traitée", message.body)

    def test_traitement_d_un_transfert(self):
        demande_id = self.demander(self.c_marie, self.u_dsi, "TRANSFERT", nouvel_employe_beneficiaire=self.jean.pk).data["demande_id"]
        reponse = self.c_gest.post(f"/api/stock/unites-article/{self.u_dsi.pk}/transferer/",
                                   {"nouvel_employe_beneficiaire": self.jean.pk, "magasin_source": self.magasin.pk, "demande_id": demande_id}, format="json")
        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.u_dsi.refresh_from_db()
        self.assertEqual(self.u_dsi.affectation.employe, self.jean)
        self.assertEqual(DemandeUnite.objects.get(pk=demande_id).statut, "TRAITEE")

    def test_demande_ne_correspondant_pas_au_mouvement_rien_n_est_fait(self):
        demande_id = self.demander(self.c_marie, self.u_marie).data["demande_id"]  # demande de RETOUR
        reponse = self.c_gest.post(f"/api/stock/unites-article/{self.u_marie.pk}/transferer/",
                                   {"nouvel_employe_beneficiaire": self.jean.pk, "magasin_source": self.magasin.pk, "demande_id": demande_id}, format="json")
        self.assertEqual(reponse.status_code, 400)
        self.u_marie.refresh_from_db()
        self.assertEqual(self.u_marie.affectation.employe, self.marie)  # aucun mouvement
        self.assertEqual(DemandeUnite.objects.get(pk=demande_id).statut, "EN_ATTENTE")

    def test_mouvement_direct_cloture_la_demande_en_attente(self):
        demande_id = self.demander(self.c_marie, self.u_marie).data["demande_id"]
        with self.captureOnCommitCallbacks(execute=True):
            self.c_gest.post(f"/api/stock/unites-article/{self.u_marie.pk}/transferer/",
                             {"nouvelle_direction_beneficiaire": self.dex.pk, "magasin_source": self.magasin.pk}, format="json")
        demande = DemandeUnite.objects.get(pk=demande_id)
        self.assertEqual((demande.statut, demande.commentaire_traitement), ("ANNULEE", "Unité déjà transférée par le gestionnaire."))
        self.assertIn("a été clôturée", next(m for m in mail.outbox if m.to == ["marie@test.mg"]).body)

    def test_refus_avec_motif(self):
        demande_id = self.demander(self.c_marie, self.u_marie).data["demande_id"]
        self.assertEqual(self.c_gest.post(f"{DEMANDES}{demande_id}/refuser/", {}, format="json").status_code, 400)
        self.assertEqual(self.c_marie.post(f"{DEMANDES}{demande_id}/refuser/", {"commentaire": "x"}, format="json").status_code, 403)
        with self.captureOnCommitCallbacks(execute=True):
            reponse = self.c_gest.post(f"{DEMANDES}{demande_id}/refuser/", {"commentaire": "Pas de stock de remplacement"}, format="json")
        self.assertEqual(reponse.data["statut"], "REFUSEE")
        self.assertIn("refusée. Motif : Pas de stock de remplacement", next(m for m in mail.outbox if m.to == ["marie@test.mg"]).body)

    def test_annulation_par_son_auteur_seulement(self):
        demande_id = self.demander(self.c_marie, self.u_dsi).data["demande_id"]
        autre_chef = self._autre_chef_dsi()
        self.assertEqual(autre_chef.post(f"{DEMANDES}{demande_id}/annuler/").status_code, 400)
        self.assertEqual(self.c_marie.post(f"{DEMANDES}{demande_id}/annuler/").data["statut"], "ANNULEE")
        self.assertEqual(self.demander(autre_chef, self.u_dsi).status_code, 201)  # l'unité peut de nouveau être demandée

    def test_listes_compteur_et_droits(self):
        self.demander(self.c_marie, self.u_marie)
        self.demander(self.c_jean, self.u_jean)
        self.assertEqual(self.c_marie.get(DEMANDES).data["count"], 1)  # ses propres demandes
        self.assertEqual(self.c_gest.get(DEMANDES).data["count"], 2)  # toutes
        self.assertEqual(self.c_gest.get(f"{DEMANDES}compteur/").data, {"en_attente": 2})
        self.assertEqual(self.c_marie.get(f"{DEMANDES}compteur/").status_code, 403)
        sans_droit = client(f.utilisateur("lecteur@test.mg", [a.CAT_LIRE], employe=f.employe("M-9", self.dsi)))
        self.assertEqual(sans_droit.post(DEMANDES, {"unite_id": self.u_dsi.pk, "type_demande": "RETOUR"}, format="json").status_code, 403)


    def test_liste_en_attente_d_abord_puis_les_traitees(self):
        traitee = self.demander(self.c_marie, self.u_marie).data["demande_id"]
        self.c_gest.post(f"/api/stock/unites-article/{self.u_marie.pk}/retourner-stock/",
                         {"magasin_destination": self.magasin.pk, "demande_id": traitee}, format="json")
        en_attente = self.demander(self.c_jean, self.u_jean).data["demande_id"]
        resultats = self.c_gest.get(DEMANDES).data["results"]
        self.assertEqual([(d["demande_id"], d["statut"]) for d in resultats], [(en_attente, "EN_ATTENTE"), (traitee, "TRAITEE")])
