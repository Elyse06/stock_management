"""Assistant : réponse en flux (étapes, texte progressif), limite de débit du service d'IA."""
import json
from unittest.mock import MagicMock, patch

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.ai.client import completer_flux
from apps.common import actions as a

from . import factories as f


def _flux(*evenements):
    """Faux ``completer_flux`` : chaque appel rejoue la liste d'événements suivante."""
    restants = list(evenements)

    def appel(*_args, **_kwargs):
        yield from restants.pop(0)
    return appel


def _appel_outil(nom, **arguments):
    return {"role": "assistant", "content": "", "tool_calls": [
        {"id": f"c-{nom}", "type": "function", "function": {"name": nom, "arguments": json.dumps(arguments)}}]}


def _lignes(reponse):
    return [json.loads(ligne) for ligne in b"".join(reponse.streaming_content).decode().splitlines() if ligne]


@override_settings(GROQ_API_KEY="test")
class FluxTests(TestCase):
    def setUp(self):
        cache.clear()
        dsi = f.direction("DSI")
        self.employe = f.employe("M-1", dsi)
        self.gestionnaire = f.utilisateur("gest@test.mg", [a.CAT_LIRE, a.COM_VAL, a.CAT_GERE], employe=self.employe)
        self.admin = f.utilisateur("admin@test.mg", [a.CAT_LIRE, a.COM_VAL, a.CAT_GERE, a.USR_GERE])
        f.article("CART-HP")

    def _client(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    def _poser_en_flux(self, user, *evenements, message="Stock de CART-HP ?"):
        with patch("apps.ai.assistant.completer_flux", side_effect=_flux(*evenements)):
            reponse = self._client(user).post("/api/ai/chat/flux/", {"message": message, "page": "/"}, format="json")
            return reponse, _lignes(reponse)

    def test_flux_etapes_texte_puis_resultat(self):
        reponse, lignes = self._poser_en_flux(
            self.admin,
            [("message", _appel_outil("stock_article", article="CART-HP"))],
            [("texte", "Il reste "), ("texte", "**0** unité."), ("message", {"role": "assistant", "content": "Il reste **0** unité."})],
        )
        self.assertEqual(reponse["Content-Type"], "application/x-ndjson; charset=utf-8")
        self.assertEqual(reponse["X-Accel-Buffering"], "no")
        types = [ligne["type"] for ligne in lignes]
        self.assertEqual(types, ["debut", "etape", "texte", "texte", "fin"])
        self.assertEqual(lignes[1]["libelle"], "Lecture du stock de l'article")
        self.assertEqual(lignes[1]["precision"], "CART-HP")
        fin = lignes[-1]
        self.assertEqual(fin["reply"], "Il reste **0** unité.")
        self.assertEqual(fin["outils_utilises"][0]["outil"], "stock_article")
        self.assertNotIn("echange_id", fin)

    def test_texte_provisoire_efface_avant_un_appel_d_outil(self):
        _, lignes = self._poser_en_flux(
            self.admin,
            [("texte", "Je regarde…"), ("message", {**_appel_outil("indicateurs_stock"), "content": "Je regarde…"})],
            [("texte", "Voici."), ("message", {"role": "assistant", "content": "Voici."})],
        )
        self.assertEqual([ligne["type"] for ligne in lignes], ["debut", "texte", "efface", "etape", "texte", "fin"])

    def test_erreur_du_service_signalee(self):
        from apps.ai.client import ErreurIA

        def en_panne(*_args, **_kwargs):
            raise ErreurIA("Le service d'IA est momentanément injoignable.")
            yield  # pragma: no cover

        with patch("apps.ai.assistant.completer_flux", side_effect=en_panne):
            reponse = self._client(self.gestionnaire).post("/api/ai/chat/flux/", {"message": "Bonjour"}, format="json")
            lignes = _lignes(reponse)
        self.assertEqual(lignes[-1], {"type": "erreur", "message": "Le service d'IA est momentanément injoignable."})

    def test_message_vide_refuse_sans_flux(self):
        reponse = self._client(self.gestionnaire).post("/api/ai/chat/flux/", {"message": "  "}, format="json")
        self.assertEqual(reponse.status_code, 400)

    def test_reponse_classique(self):
        with patch("apps.ai.assistant.completer", return_value={"role": "assistant", "content": "Bonjour"}):
            data = self._client(self.gestionnaire).post("/api/ai/chat/", {"message": "Salut"}, format="json").json()
        self.assertEqual(data["reply"], "Bonjour")
        self.assertNotIn("echange_id", data)

    def test_adresses_du_journal_supprimees(self):
        client = self._client(self.admin)
        for chemin in ("/api/ai/journal/", "/api/ai/journal/statistiques/"):
            self.assertEqual(client.get(chemin).status_code, 404)
        self.assertEqual(client.post("/api/ai/echanges/1/avis/", {"avis": 1}, format="json").status_code, 404)


class CompleterFluxTests(TestCase):
    @override_settings(GROQ_API_KEY="test")
    def test_accents_decodes_en_utf8_meme_sans_charset_annonce(self):
        # Le service annonce « text/event-stream » sans charset : requests décoderait en Latin-1.
        import io

        import requests

        texte = "Aucun article n’est sous le seuil d’alerte du 13\u202fau 19\u202foctobre : réapprovisionnement."
        corps = "".join(
            "data: " + json.dumps({"choices": [{"delta": {"content": texte[i:i + 5]}}]}, ensure_ascii=False) + "\n\n"
            for i in range(0, len(texte), 5)
        ) + "data: [DONE]\n\n"
        reponse = requests.models.Response()
        reponse.status_code = 200
        reponse.headers["Content-Type"] = "text/event-stream"
        reponse.encoding = requests.utils.get_encoding_from_headers(reponse.headers)
        reponse.raw = io.BytesIO(corps.encode("utf-8"))
        with patch("apps.ai.client.requests.post", return_value=reponse):
            evenements = list(completer_flux([{"role": "user", "content": "Q"}]))
        self.assertEqual(evenements[-1][1]["content"], texte)
        self.assertEqual("".join(v for t, v in evenements if t == "texte"), texte)

    @override_settings(GROQ_API_KEY="test")
    def test_reconstitue_texte_et_appels_d_outils(self):
        lignes = [
            'data: {"choices":[{"delta":{"role":"assistant","content":""}}]}',
            "",
            'data: {"choices":[{"delta":{"content":"Bon"}}]}',
            'data: {"choices":[{"delta":{"content":"jour"}}]}',
            'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c1","function":{"name":"stock_article","arguments":"{\\"art"}}]}}]}',
            'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"icle\\": \\"X\\"}"}}]}}]}',
            ": commentaire ignoré",
            "data: [DONE]",
        ]
        reponse = MagicMock(status_code=200)
        reponse.iter_lines.return_value = iter(lignes)
        with patch("apps.ai.client.requests.post", return_value=reponse) as post:
            evenements = list(completer_flux([{"role": "user", "content": "Q"}], tools=[]))
        self.assertTrue(post.call_args.kwargs["stream"])
        self.assertTrue(post.call_args.kwargs["json"]["stream"])
        self.assertEqual(evenements[:2], [("texte", "Bon"), ("texte", "jour")])
        type_final, message = evenements[-1]
        self.assertEqual(type_final, "message")
        self.assertEqual(message["content"], "Bonjour")
        self.assertEqual(message["tool_calls"], [{"id": "c1", "type": "function",
                                                  "function": {"name": "stock_article", "arguments": '{"article": "X"}'}}])
        reponse.close.assert_called_once()


@override_settings(GROQ_API_KEY="test")
class LimiteDeDebitTests(TestCase):
    """HTTP 429 du service d'IA : nouvel essai automatique après l'attente conseillée, sinon message clair."""

    def setUp(self):
        cache.clear()
        self.gestionnaire = f.utilisateur("gest@test.mg", [a.CAT_LIRE, a.COM_VAL, a.CAT_GERE])
        self.client = APIClient()
        self.client.force_authenticate(self.gestionnaire)

    @staticmethod
    def _reponse_429(**entetes):
        reponse = MagicMock(status_code=429, headers=entetes, text="Rate limit reached")
        return reponse

    def test_attente_lue_dans_les_entetes(self):
        from apps.ai.client import ErreurQuota, attente_conseillee, completer

        self.assertEqual(attente_conseillee(self._reponse_429(**{"retry-after": "7"})), 7.0)
        self.assertAlmostEqual(attente_conseillee(self._reponse_429(**{"x-ratelimit-reset-tokens": "1m2.5s"})), 62.5)
        self.assertAlmostEqual(attente_conseillee(self._reponse_429(**{"x-ratelimit-reset-tokens": "450ms"})), 0.45)
        self.assertIsNone(attente_conseillee(self._reponse_429()))
        with patch("apps.ai.client.requests.post", return_value=self._reponse_429(**{"retry-after": "3"})), \
                self.assertRaises(ErreurQuota) as erreur:
            completer([{"role": "user", "content": "Q"}])
        self.assertEqual(erreur.exception.attente, 3.0)
        self.assertNotIn("429", str(erreur.exception))

    def test_nouvel_essai_apres_attente_courte_avec_etape_affichee(self):
        from apps.ai.client import ErreurQuota

        appels = []

        def modele(*_args, **_kwargs):
            appels.append(1)
            if len(appels) == 1:
                raise ErreurQuota("quota", attente=4.2)
            yield "texte", "Bonjour"
            yield "message", {"role": "assistant", "content": "Bonjour"}

        with patch("apps.ai.assistant.completer_flux", side_effect=modele), patch("apps.ai.assistant.attendre") as attendre:
            lignes = _lignes(self.client.post("/api/ai/chat/flux/", {"message": "Salut"}, format="json"))
        self.assertEqual([ligne["type"] for ligne in lignes], ["debut", "etape", "texte", "fin"])
        self.assertEqual(lignes[1]["precision"], "5 s")
        self.assertIn("très sollicité", lignes[1]["libelle"])
        attendre.assert_called_once()
        self.assertEqual(lignes[-1]["reply"], "Bonjour")

    def test_abandon_si_attente_trop_longue_ou_essais_epuises(self):
        from apps.ai.client import MESSAGE_QUOTA, ErreurQuota

        for attente, essais_attendus in ((90, 1), (1, 3)):
            with self.subTest(attente=attente), \
                    patch("apps.ai.assistant.completer", side_effect=ErreurQuota(MESSAGE_QUOTA, attente)) as modele, \
                    patch("apps.ai.assistant.attendre"):
                reponse = self.client.post("/api/ai/chat/", {"message": "Salut"}, format="json")
            self.assertEqual(reponse.status_code, 502)
            self.assertEqual(reponse.json()["error"], MESSAGE_QUOTA)
            self.assertEqual(modele.call_count, essais_attendus)
