"""Étape 1 de l'amélioration de l'assistant : recherche tolérante, ambiguïtés, périodes, contexte de page."""
import json
from datetime import date, datetime, time, timedelta
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.ai.chat_prompts import get_chat_system_prompt
from apps.ai.outils import PAR_NOM, Contexte
from apps.ai.outils.periodes import plage
from apps.common import actions as a
from apps.stock.models import Mouvement

from . import factories as f


class _Requete:
    def __init__(self, user):
        self.user = user


def appel(nom, **arguments):
    return {"role": "assistant", "content": "", "tool_calls": [
        {"id": f"c-{nom}", "type": "function", "function": {"name": nom, "arguments": json.dumps(arguments)}}]}


@override_settings(GROQ_API_KEY="test")
class ComprehensionTests(TestCase):
    def setUp(self):
        self.user = f.utilisateur("gest@test.mg", [a.CAT_LIRE, a.MOV_LIRE, a.COM_DEM])
        self.contexte = Contexte(_Requete(self.user))
        self.magasin = f.magasin("Magasin central")
        self.dell = f.article("LAPDELL")
        self.dell.designation = "Ordinateur portable Dell Latitude"
        self.dell.save()
        self.hp = f.article("CART-HP")
        self.hp.designation = "Cartouche d'encre HP 305"
        self.hp.save()
        self.canon = f.article("CART-CANON")
        self.canon.designation = "Cartouche d'encre Canon 545"
        self.canon.save()

    def outil(self, nom, **arguments):
        return PAR_NOM[nom].appeler(self.contexte, arguments)

    def test_recherche_tolerante(self):
        cas = {"ordinateurs Dell": ["LAPDELL"], "ORDINATEUR latitude": ["LAPDELL"], "cartouches d encre": ["CART-CANON", "CART-HP"],
               "encre hp": ["CART-HP"], "imprimante": []}
        for recherche, attendus in cas.items():
            codes = sorted(x["code"] for x in self.outil("rechercher_articles", texte=recherche).pour_ia["articles"])
            self.assertEqual(codes, attendus, recherche)

    def test_ambiguite_proposee_au_lieu_de_deviner(self):
        resultat = self.outil("stock_article", article="cartouche")
        self.assertTrue(resultat.pour_ia["ambigu"])
        self.assertEqual(sorted(c["code"] for c in resultat.pour_ia["candidats"]), ["CART-CANON", "CART-HP"])
        self.assertEqual(len(resultat.choix), 2)
        self.assertIn("Quel est le stock de l'article CART-", resultat.choix[0]["message"])
        self.assertNotIn("ambigu", self.outil("stock_article", article="cart-hp").pour_ia)  # code exact : direct
        self.assertEqual(self.outil("stock_article", article="cartouche canon").pour_ia["code"], "CART-CANON")

    def test_choix_transmis_a_l_interface(self):
        client = APIClient()
        client.force_authenticate(self.user)
        reponses = [appel("stock_article", article="cartouche"), {"role": "assistant", "content": "Laquelle ?"}]
        with patch("apps.ai.assistant.completer", side_effect=reponses):
            data = client.post("/api/ai/chat/", {"message": "stock des cartouches"}, format="json").data
        self.assertEqual(len(data["choix"]), 2)
        self.assertEqual({c["libelle"] for c in data["choix"]},
                         {"Cartouche d'encre HP 305 (CART-HP)", "Cartouche d'encre Canon 545 (CART-CANON)"})

    def test_periode_calculee_par_le_serveur(self):
        aujourd_hui = timezone.localdate()
        lundi = aujourd_hui - timedelta(days=aujourd_hui.weekday())
        for jour, quantite in ((lundi - timedelta(days=3), 5), (lundi, 2)):  # semaine dernière, puis cette semaine
            m = f.mouvement(Mouvement.Type.ENTREE, self.dell, quantite, destination=self.magasin)
            Mouvement.objects.filter(pk=m.pk).update(date=timezone.make_aware(datetime.combine(jour, time(10))))
        resultat = self.outil("mouvements_recents", periode="semaine_derniere")
        self.assertEqual(resultat.pour_ia["quantites_par_type"], {"Entrée": 5})
        self.assertEqual(resultat.pour_ia["periode"], f"du {lundi - timedelta(days=7):%d/%m/%Y} au {lundi - timedelta(days=1):%d/%m/%Y}")
        self.assertEqual(self.outil("mouvements_recents", periode="cette_semaine").pour_ia["quantites_par_type"], {"Entrée": 2})
        with self.assertRaisesMessage(Exception, "AAAA-MM-JJ"):
            self.outil("mouvements_recents", date_debut="16/10/2026")

    def test_calendrier_des_periodes(self):
        with patch("django.utils.timezone.localdate", return_value=date(2026, 10, 16)):  # un vendredi
            libelles = {p: plage(p)[2] for p in ("semaine_derniere", "mois_dernier", "trimestre_dernier", "annee_derniere", "hier")}
        self.assertEqual(libelles, {
            "semaine_derniere": "du 05/10/2026 au 11/10/2026", "mois_dernier": "du 01/09/2026 au 30/09/2026",
            "trimestre_dernier": "du 01/07/2026 au 30/09/2026", "annee_derniere": "du 01/01/2025 au 31/12/2025",
            "hier": "le 15/10/2026",
        })

    def test_contexte_de_la_page(self):
        consignes = get_chat_system_prompt(self.contexte, "/catalogue/articles/LAPDELL")
        self.assertIn("la fiche de l'article « Ordinateur portable Dell Latitude » (code LAPDELL)", consignes)
        self.assertIn("vendredi" if timezone.localdate().weekday() == 4 else "Nous sommes le", consignes)
        sans_droit = Contexte(_Requete(f.utilisateur("demandeur@test.mg", [a.COM_DEM])))
        self.assertNotIn("consulte actuellement", get_chat_system_prompt(sans_droit, "/catalogue/articles/LAPDELL"))
        self.assertNotIn("consulte actuellement", get_chat_system_prompt(self.contexte, "javascript:alert(1)"))

    def test_page_transmise_par_l_interface(self):
        client = APIClient()
        client.force_authenticate(self.user)
        with patch("apps.ai.assistant.completer", return_value={"role": "assistant", "content": "ok"}) as modele:
            client.post("/api/ai/chat/", {"message": "Combien en reste-t-il ?", "page": "/catalogue/articles/LAPDELL"}, format="json")
        consignes = modele.call_args.args[0][0]["content"]
        self.assertIn("code LAPDELL", consignes)
