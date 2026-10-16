"""Étape 2 : outils d'analyse et de suivi, et mémoire des questions de suivi (jeu de données de l'évaluation)."""
from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.ai.chat_prompts import nettoyer_historique
from apps.ai.evaluation import donnees
from apps.ai.evaluation.evaluateur import _Requete
from apps.ai.outils import PAR_NOM, Contexte, ErreurOutil


@override_settings(ASSISTANT_RYTHME_JOURS=90, ASSISTANT_COUVERTURE_JOURS=60, ASSISTANT_URGENCE_JOURS=30, GROQ_API_KEY="test")
class AnalysesTests(TestCase):
    def setUp(self):
        self.utilisateurs = donnees.creer()

    def outil(self, nom, profil="gestionnaire", **arguments):
        return PAR_NOM[nom].appeler(Contexte(_Requete(self.utilisateurs[profil])), arguments)

    def test_consommation_regroupee(self):
        r = self.outil("consommation", regroupement="direction", article="ramettes", periode="3_derniers_mois").pour_ia
        self.assertEqual((r["quantite_totale_sortie"], {g["nom"]: g["quantite"] for g in r["groupes"]}), (75, {"DAF": 40, "DSI": 35}))
        mois = self.outil("consommation", regroupement="mois", article="ramette", periode="12_derniers_mois").pour_ia["groupes"]
        self.assertIn(40, [g["quantite"] for g in mois])  # le mois de la sortie de J-60

    def test_comparaison_de_periodes(self):
        r = self.outil("comparer_periodes", periode_a="semaine_derniere", periode_b="cette_semaine", article="ramette").pour_ia
        self.assertEqual((r["periode_a"]["total"], r["periode_b"]["total"], r["evolution_pourcentage"]), (30, 5, -83))

    def test_reapprovisionnement(self):
        articles = {x["code"]: x for x in self.outil("reapprovisionnement").pour_ia["articles"]}
        self.assertEqual(sorted(articles), ["CART-HP", "LAPHP"])  # sous le seuil ; les ramettes tiennent encore 78 jours
        self.assertEqual((articles["CART-HP"]["jours_de_stock_restants"], articles["CART-HP"]["quantite_conseillee"]), (12, 22))
        self.assertEqual((articles["LAPHP"]["stock"], articles["LAPHP"]["quantite_conseillee"]), (0, 2))
        ramette = self.outil("reapprovisionnement", article="ramette").pour_ia["articles"][0]  # article demandé : toujours affiché
        self.assertEqual((ramette["jours_de_stock_restants"], ramette["consommation_par_mois"]), (78, 25.0))

    def test_valeur_du_stock_au_prix_moyen(self):
        r = self.outil("valeur_stock").pour_ia
        self.assertEqual(r["valeur_totale"], "10 244 829 Ar")
        self.assertEqual(r["articles_sans_prix"]["nombre"], 0)
        self.assertFalse(PAR_NOM["valeur_stock"].autorise(Contexte(_Requete(self.utilisateurs["demandeur"]))))

    def test_ecarts_du_dernier_inventaire_valide(self):
        r = self.outil("ecarts_inventaire").pour_ia
        self.assertEqual((r["reference"], r["articles_en_ecart"]), ("INV-EVAL-000", 1))
        self.assertEqual((r["ecarts"][0]["article"], r["ecarts"][0]["ecart"], r["ecarts"][0]["commentaire"]),
                         ("Ramette papier A4", "-5", "Ramettes abîmées"))

    def test_delais_des_commandes(self):
        r = self.outil("delais_commandes").pour_ia
        self.assertEqual((r["commandes_traitees"], r["delai_moyen_jours"], r["delai_maximum_jours"]), (2, 3.0, 4.0))
        self.assertEqual([c["numero"] for c in r["plus_anciennes_en_attente"]], [3, 1])

    def test_stock_d_un_lieu_et_ambiguite(self):
        central = {x["article"]: x["stock"] for x in self.outil("stock_lieu", lieu="magasin central").pour_ia["articles"]}
        self.assertEqual((central["Ramette papier A4"], central["Cartouche d'encre HP 305"]), ("65", "3"))
        dsi = {x["article"]: x["stock"] for x in self.outil("stock_lieu", lieu="DSI").pour_ia["articles"]}
        self.assertEqual(dsi["Ramette papier A4"], "35")
        toamasina = self.outil("stock_lieu", lieu="Toamasina")  # un magasin ET une agence
        self.assertTrue(toamasina.pour_ia["ambigu"])
        self.assertEqual(len(toamasina.choix), 2)

    def test_detail_d_une_commande_selon_les_droits(self):
        self.assertEqual(self.outil("detail_commande", numero=3).pour_ia["demandeur"], "ANDRIA Paul")
        with self.assertRaisesMessage(ErreurOutil, "introuvable"):
            self.outil("detail_commande", profil="demandeur", numero=3)  # commande d'une autre personne

    def test_demandes_et_equipements(self):
        self.assertEqual(self.outil("demandes_unites", profil="demandeur").pour_ia["demandes"][0]["numero_serie"], "SN-DELL-001")
        self.assertEqual(self.outil("demandes_unites", profil="autre_direction").pour_ia["total"], 0)
        self.assertEqual(self.outil("demandes_unites").pour_ia["total"], 1)  # gestionnaire du stock : toutes
        equipements = {e["numero_serie"]: e for e in self.outil("mes_equipements", profil="demandeur").pour_ia["equipements"]}
        self.assertEqual(sorted(equipements), ["SN-DELL-001", "SN-DELL-002"])
        self.assertEqual(equipements["SN-DELL-001"]["demande_en_cours"], "Retour en stock")
        self.assertIn("direction", equipements["SN-DELL-002"]["attribue_a"])


@override_settings(GROQ_API_KEY="test")
class MemoireDeSuiviTests(TestCase):
    def test_historique_complete_par_les_outils_utilises(self):
        historique = [{"role": "user", "content": "Stock des cartouches HP ?"},
                      {"role": "assistant", "content": "Il en reste 3.", "outils": [
                          {"outil": "stock_article", "arguments": {"article": "CART-HP"}},
                          {"outil": "outil_inconnu", "arguments": {}},
                          {"outil": "mouvements_recents", "arguments": {"article": {"imbrique": 1}, "periode": "ce_mois"}}]}]
        assistant = nettoyer_historique(historique)[1]["content"]
        self.assertIn('[Outils utilisés pour cette réponse : stock_article(article="CART-HP"), mouvements_recents(periode="ce_mois")]', assistant)
        self.assertNotIn("outil_inconnu", assistant)

    def test_outils_utilises_renvoyes_par_l_api(self):
        utilisateurs = donnees.creer()
        client = APIClient()
        client.force_authenticate(utilisateurs["gestionnaire"])
        appel = {"role": "assistant", "content": "", "tool_calls": [{"id": "1", "type": "function", "function": {
            "name": "stock_article", "arguments": '{"article": "CART-HP"}'}}]}
        with patch("apps.ai.assistant.completer", side_effect=[appel, {"role": "assistant", "content": "Il en reste 3."}]):
            data = client.post("/api/ai/chat/", {"message": "Stock des cartouches HP 305 ?"}, format="json").data
        self.assertEqual(data["outils_utilises"], [{"outil": "stock_article", "arguments": {"article": "CART-HP"}}])
