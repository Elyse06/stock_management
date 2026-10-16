"""Évalue l'assistant sur un jeu de données fixe, avec le VRAI modèle (clé Groq requise).

    python manage.py evaluer_assistant --settings=config.settings.test
    python manage.py evaluer_assistant --settings=config.settings.test --modele openai/gpt-oss-120b
    python manage.py evaluer_assistant --settings=config.settings.test --cas S1,P1,A1

Une base temporaire est créée puis supprimée : les données réelles ne sont jamais touchées.
"""
import time

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.test.runner import DiscoverRunner
from django.test.utils import override_settings

from apps.ai.client import ia_configuree
from apps.ai.evaluation import donnees
from apps.ai.evaluation.evaluateur import evaluer_cas, rapport_markdown
from apps.ai.evaluation.questions import CAS


class Command(BaseCommand):
    help = "Évalue la qualité des réponses de l'assistant (base temporaire, vrai modèle)."

    def add_arguments(self, parser):
        parser.add_argument("--modele", help="Modèle Groq à évaluer (par défaut : GROQ_MODEL).")
        parser.add_argument("--cas", help="Identifiants des questions à poser, séparés par des virgules (ex. S1,P1).")
        parser.add_argument("--sortie", default="evaluation_assistant.md", help="Fichier du rapport (Markdown).")
        parser.add_argument("--pause", type=float, default=2.0, help="Pause entre deux questions, en secondes (quota Groq).")

    def handle(self, *args, **options):
        if not ia_configuree():
            raise CommandError("GROQ_API_KEY n'est pas configurée : l'évaluation interroge le vrai modèle.")
        selection = {c.strip() for c in (options["cas"] or "").split(",") if c.strip()}
        cas = [c for c in CAS if not selection or c["id"] in selection]
        if not cas:
            raise CommandError("Aucune question ne correspond à --cas.")
        modele = options["modele"] or settings.GROQ_MODEL
        runner = DiscoverRunner(verbosity=0, interactive=False)
        bases = runner.setup_databases()
        try:
            with override_settings(GROQ_MODEL=modele):
                utilisateurs = donnees.creer()
                resultats = []
                for i, c in enumerate(cas):
                    if i:
                        time.sleep(options["pause"])
                    r = evaluer_cas(c, utilisateurs)
                    resultats.append(r)
                    etat = "ok " if r["reussi"] else "ÉCHEC"
                    self.stdout.write(f"{etat} {c['id']:<3} {c['question'][:70]} ({r['duree']:.1f} s)")
        finally:
            runner.teardown_databases(bases)
        with open(options["sortie"], "w", encoding="utf-8") as f:
            f.write(rapport_markdown(resultats, modele))
        notes = [r for r in resultats if not r["cas"].get("informatif")]
        reussis = sum(r["reussi"] for r in notes)
        self.stdout.write(self.style.SUCCESS(f"\nScore : {reussis} / {len(notes)} — rapport : {options['sortie']}"))
