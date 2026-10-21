import pandas as pd
from django.core.management.base import BaseCommand, CommandError

from apps.common.params import parse_sheet
from apps.stock.services_import.import_immobilisations import (
    detecter_index_entete,
    importer_immobilisations,
)


class Command(BaseCommand):
    help = "Importe le fichier Excel de suivi des immobilisations"

    def add_arguments(self, parser):
        parser.add_argument("fichier", type=str, help="Chemin vers le fichier .xlsx")
        parser.add_argument("--dry-run", action="store_true", help="Simule sans écrire en base")
        parser.add_argument("--feuille", type=parse_sheet, default=0)
        parser.add_argument(
            "--ligne-entete",
            type=int,
            default=None,
            help="Force l'index (0-based) de la ligne d'en-tête. Par défaut : détection automatique.",
        )

    def handle(self, *args, **options):
        try:
            if options["ligne_entete"] is not None:
                ligne_entete = options["ligne_entete"]
            else:
                ligne_entete = detecter_index_entete(options["fichier"], feuille=options["feuille"])
                self.stdout.write(f"Ligne d'en-tête détectée automatiquement : {ligne_entete + 1}")

            df = pd.read_excel(
                options["fichier"],
                sheet_name=options["feuille"],
                header=ligne_entete,
            )
        except FileNotFoundError as exc:
            raise CommandError(f"Fichier introuvable : {options['fichier']}") from exc

        try:
            rapport = importer_immobilisations(df, dry_run=options["dry_run"])
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        if rapport["colonnes_manquantes"]:
            self.stdout.write(self.style.WARNING(
                f"Colonnes attendues absentes : {rapport['colonnes_manquantes']}"
            ))

        for d in rapport["details"]:
            marqueur = "✔" if d["statut"] == "OK" else "✘"
            texte = d.get("message") or (
                f"{d.get('designation', '')[:30]:<30} article={d.get('article')} "
                f"({'créé' if d.get('article_cree') else 'existant'})"
                + (f" -> {d['attribue_a']}" if d.get("attribue_a") else "")
                + (f" -- {d['avertissement']}" if d.get("avertissement") else "")
            )
            self.stdout.write(f"  {marqueur} Ligne {d['ligne']:>4} — {texte}")

        if rapport["dry_run"]:
            self.stdout.write(self.style.WARNING("\n--dry-run actif : rien n'a été enregistré\n"))

        self.stdout.write(
            f"Total : {rapport['lignes_ok']} OK, {rapport['lignes_erreur']} erreur(s)"
        )
