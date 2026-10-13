import json
from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.ai.outils import PAR_NOM, Contexte, outils_autorises
from apps.ai.outils.base import nettoyer_arguments
from apps.commande.models import Commande
from apps.common import actions as a

from . import factories as f


class _Requete:
    """Requête minimale pour construire un Contexte hors d'une vue."""

    def __init__(self, user):
        self.user = user


def appel(nom, **arguments):
    return {"role": "assistant", "content": "", "tool_calls": [
        {"id": f"c-{nom}", "type": "function", "function": {"name": nom, "arguments": json.dumps(arguments)}}
    ]}


def texte(contenu):
    return {"role": "assistant", "content": contenu}


@override_settings(GROQ_API_KEY="test")
class AssistantTests(TestCase):
    def setUp(self):
        self.dsi = f.direction("DSI")
        self.moi = f.employe("M-1", self.dsi)
        self.autre = f.employe("M-2", f.direction("DEX"))
        self.demandeur = f.utilisateur("dem@test.mg", [a.COM_DEM], employe=self.moi)
        self.admin = f.utilisateur("admin@test.mg", [a.CAT_LIRE, a.CAT_GERE, a.MOV_LIRE, a.INV_LIRE, a.COM_VAL, a.USR_GERE])

    def _discuter(self, user, reponses_du_modele, message="question"):
        client = APIClient()
        client.force_authenticate(user)
        with patch("apps.ai.assistant.completer", side_effect=reponses_du_modele) as modele:
            reponse = client.post("/api/ai/chat/", {"message": message}, format="json")
        return reponse, modele

    def test_outils_proposes_selon_les_droits(self):
        noms = {o.nom for o in outils_autorises(Contexte(_Requete(self.demandeur)))}
        self.assertEqual(noms, {"aide_navigation", "commandes", "rechercher_employes"})
        tous = {o.nom for o in outils_autorises(Contexte(_Requete(self.admin)))}
        self.assertEqual(tous, set(PAR_NOM))

    def test_seuls_les_outils_autorises_sont_envoyes_au_modele(self):
        _, modele = self._discuter(self.demandeur, [texte("Bonjour")])
        envoyes = {t["function"]["name"] for t in modele.call_args.kwargs["tools"]}
        self.assertNotIn("rechercher_articles", envoyes)
        self.assertNotIn("mouvements_recents", envoyes)

    def test_outil_non_autorise_refuse_meme_si_le_modele_l_appelle(self):
        f.article("PC")
        reponse, modele = self._discuter(self.demandeur, [appel("rechercher_articles"), texte("Pas accès.")])
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.data["tableaux"], [])
        resultat_outil = modele.call_args_list[1].args[0][-1]
        self.assertIn("non autorisé", resultat_outil["content"])

    def test_un_demandeur_ne_voit_que_ses_commandes(self):
        mienne = Commande.objects.create(employe_demandeur=self.moi, objet="Mienne")
        Commande.objects.create(employe_demandeur=self.autre, objet="Autre")
        reponse, modele = self._discuter(self.demandeur, [appel("commandes"), texte("Vous avez 1 commande.")])
        lignes = reponse.data["tableaux"][0]["lignes"]
        self.assertEqual([ligne[0] for ligne in lignes], [str(mienne.pk)])
        donnees = json.loads(modele.call_args_list[1].args[0][-1]["content"])
        self.assertEqual(donnees["total_filtre"], 1)
        self.assertEqual(reponse.data["reply"], "Vous avez 1 commande.")

    def test_aide_navigation_limitee_aux_pages_accessibles(self):
        reponse, modele = self._discuter(self.demandeur, [appel("aide_navigation", sujet="faire une commande"), texte("…")])
        donnees = json.loads(modele.call_args_list[1].args[0][-1]["content"])
        chemins = {p["chemin"] for p in donnees["pages_accessibles"]}
        self.assertIn("/commandes", chemins)
        self.assertNotIn("/utilisateurs", chemins)
        self.assertNotIn("/catalogue/articles", chemins)
        self.assertEqual(donnees["guides"][0]["tache"], "Faire une demande de matériel (commande)")
        self.assertEqual(reponse.data["liens"], [{"libelle": "Faire une demande de matériel (commande)", "chemin": "/commandes"}])

    def test_recherche_d_articles_et_stock(self):
        article = f.article("RAM", seuil=10)
        f.mouvement("ENTREE", article, 4, destination=f.magasin("Central"))
        reponse, _ = self._discuter(self.admin, [appel("rechercher_articles", sous_seuil=True), texte("1 article.")])
        tableau = reponse.data["tableaux"][0]
        self.assertEqual(tableau["lignes"], [["RAM", article.designation, "4", "10"]])
        self.assertEqual(tableau["lien"]["chemin"], "/catalogue/articles")

    def test_plusieurs_tours_puis_reponse_finale_forcee(self):
        reponses = [appel("indicateurs_stock")] * 4 + [texte("Synthèse.")]
        reponse, modele = self._discuter(self.admin, reponses)
        self.assertEqual(reponse.data["reply"], "Synthèse.")
        self.assertEqual(modele.call_args.kwargs["tool_choice"], "none")

    def test_accessible_sans_aucun_droit_pour_l_aide(self):
        sans_droit = f.utilisateur("nouveau@test.mg")
        reponse, modele = self._discuter(sans_droit, [texte("Bienvenue")])
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual({t["function"]["name"] for t in modele.call_args.kwargs["tools"]},
                         {"aide_navigation", "rechercher_employes"})

    def test_arguments_du_modele_nettoyes(self):
        schema = PAR_NOM["mouvements_recents"].parametres
        propres = nettoyer_arguments(schema, {"limite": 9999, "jours": -5, "type": "DROP TABLE", "inconnu": 1})
        self.assertEqual(propres, {"limite": 50, "jours": 1})

    @override_settings(GROQ_API_KEY="")
    def test_service_non_configure(self):
        client = APIClient()
        client.force_authenticate(self.demandeur)
        self.assertEqual(client.post("/api/ai/chat/", {"message": "x"}, format="json").status_code, 503)


class CarteTests(TestCase):
    def test_liens_selon_les_droits(self):
        from apps.ai.carte import chemin_accessible

        demandeur = frozenset({a.COM_DEM})
        self.assertTrue(chemin_accessible("/commandes", demandeur))
        self.assertFalse(chemin_accessible("/utilisateurs", demandeur))
        self.assertFalse(chemin_accessible("/inventaire/sessions/realisation", frozenset({a.INV_LIRE})))
        self.assertTrue(chemin_accessible("/inventaire/sessions/realisation", frozenset({a.INV_GERE})))
        self.assertTrue(chemin_accessible("/catalogue/articles/PC?x=1", frozenset({a.CAT_LIRE})))
        self.assertFalse(chemin_accessible("/page-inconnue", frozenset({a.USR_GERE})))
