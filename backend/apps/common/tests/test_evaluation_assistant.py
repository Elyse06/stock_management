"""Le banc d'évaluation de l'assistant : jeu de données cohérent avec les questions, et notation juste."""
from django.test import TestCase

from apps.ai.evaluation import donnees
from apps.ai.evaluation.evaluateur import _Requete, rapport_markdown, verifier
from apps.ai.evaluation.questions import CAS
from apps.ai.outils import PAR_NOM, Contexte


class JeuDeDonneesTests(TestCase):
    """Les réponses attendues par les questions correspondent bien aux données créées."""

    def setUp(self):
        self.utilisateurs = donnees.creer()
        self.contexte = Contexte(_Requete(self.utilisateurs["gestionnaire"]))

    def outil(self, nom, **arguments):
        return PAR_NOM[nom].appeler(self.contexte, arguments).pour_ia

    def test_valeurs_attendues(self):
        stocks = {x["code"]: x["stock"] for x in self.outil("rechercher_articles")["articles"]}
        self.assertEqual((stocks["PAPA4"], stocks["CART-HP"], stocks["CART-CANON"], stocks["LAPHP"], stocks["LAPDELL"]), (65, 3, 12, 0, 2))
        self.assertEqual(sorted(x["code"] for x in self.outil("rechercher_articles", sous_seuil=True)["articles"]), ["CART-HP", "LAPHP"])
        self.assertEqual(self.outil("mouvements_recents", type="SORTIE", periode="semaine_derniere")["quantites_par_type"], {"Sortie": 38})
        self.assertEqual(self.outil("mouvements_recents", type="SORTIE", periode="cette_semaine", article="ramette")["quantites_par_type"],
                         {"Sortie": 5})
        self.assertEqual(self.outil("mouvements_recents", type="ENTREE", periode="12_derniers_mois", article="ramette")["quantites_par_type"],
                         {"Entrée": 140})
        self.assertEqual([u["numero_serie"] for u in self.outil("unites_attribuees", beneficiaire="RABE Marie")["unites"]], ["SN-DELL-001"])
        self.assertTrue(self.outil("stock_article", article="cartouche")["ambigu"])
        self.assertEqual(self.outil("commandes", periode="7_derniers_jours")["total_filtre"], 2)
        self.assertEqual([i["reference"] for i in self.outil("inventaires", statut="EN_ATTENTE")["inventaires"]], ["INV-EVAL-001"])

    def test_cloisonnement_des_profils(self):
        demandeur = Contexte(_Requete(self.utilisateurs["demandeur"]))
        commandes = PAR_NOM["commandes"].appeler(demandeur, {}).pour_ia["commandes"]
        self.assertEqual({c["demandeur"] for c in commandes}, {"RABE Marie"})
        self.assertFalse(PAR_NOM["mouvements_recents"].autorise(demandeur))


class NotationTests(TestCase):
    def test_verifications(self):
        cas = {"outils": ["commandes"], "arguments": {"commandes": {"periode": "semaine_derniere"}},
               "contient": ["Réponse attendue"], "absent": ["ANDRIA"], "precision": True}
        reponse = {"reply": "La reponse attendue ? Laquelle ?", "tableaux": [{"titre": "T", "lignes": [["RABE Marie"]]}], "choix": []}
        trace = [{"outil": "commandes", "arguments": '{"periode": "semaine_derniere"}'}]
        self.assertTrue(all(ok for _, ok, _ in verifier(cas, reponse, trace)))
        reponse["tableaux"][0]["lignes"].append(["ANDRIA Paul"])  # donnée hors droits affichée
        echecs = [nom for nom, ok, _ in verifier(cas, reponse, [{"outil": "commandes", "arguments": '{"periode": "ce_mois"}'}]) if not ok]
        self.assertEqual(echecs, ["commandes(periode=semaine_derniere)", "n'affiche pas « ANDRIA »"])

    def test_rapport(self):
        resultat = {"cas": CAS[0], "reponse": {"reply": "Il en reste 2."}, "trace": [], "verifications": [("outil attendu", False, "x")],
                    "reussi": False, "duree": 1.2}
        texte = rapport_markdown([resultat], "openai/gpt-oss-20b")
        self.assertIn("**Score : 0 / 1 (0 %)**", texte)
        self.assertIn("❌ outil attendu — x", texte)

    def test_identifiants_uniques(self):
        identifiants = [c["id"] for c in CAS]
        self.assertEqual(len(identifiants), len(set(identifiants)))


class QuestionDeSuiteTests(TestCase):
    def test_le_second_tour_recoit_l_historique_et_les_outils(self):
        from unittest.mock import patch

        from django.test import override_settings

        from apps.ai.evaluation.evaluateur import evaluer_cas

        utilisateurs = donnees.creer()
        appel = {"role": "assistant", "content": "", "tool_calls": [{"id": "1", "type": "function", "function": {
            "name": "stock_article", "arguments": '{"article": "CART-HP"}'}}]}
        reponses = [appel, {"role": "assistant", "content": "Il en reste 3."}, {"role": "assistant", "content": "22 consommées."}]
        cas = {"id": "M", "theme": "T", "profil": "gestionnaire", "suite": "Stock des cartouches HP ?", "question": "Et la consommation ?",
               "contient": ["22"]}
        with override_settings(GROQ_API_KEY="test"), patch("apps.ai.assistant.completer", side_effect=reponses) as modele:
            resultat = evaluer_cas(cas, utilisateurs)
        messages_second_tour = modele.call_args_list[-1].args[0]
        self.assertIn('[Outils utilisés pour cette réponse : stock_article(article="CART-HP")]', messages_second_tour[-2]["content"])
        self.assertTrue(resultat["reussi"])
