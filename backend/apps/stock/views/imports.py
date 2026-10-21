import pandas as pd

from apps.common import actions
from apps.common.imports import BaseImportView
from apps.common.permissions import HasAction
from apps.stock.services_import import import_fournitures, import_immobilisations


class _BaseImportStock(BaseImportView):
    permission_classes = [HasAction.for_actions(actions.CAT_GERE)]  # noqa: RUF012
    extensions = (".xlsx", ".xls")
    module = None

    def lire_dataframe(self, fichier, extension, options):
        if options["ligne_entete"] is None:
            options["ligne_entete"] = self.module.detecter_index_entete(fichier, feuille=options["feuille"])
        self.avant_lecture(fichier, options)
        return pd.read_excel(fichier, sheet_name=options["feuille"], header=options["ligne_entete"])

    def avant_lecture(self, fichier, options):
        pass

    def completer_rapport(self, rapport, options):
        rapport["ligne_entete_utilisee"] = options["ligne_entete"] + 1
        return rapport


class ImportImmobilisationsView(_BaseImportStock):
    nom_import = "immobilisations"
    module = import_immobilisations

    def importer(self, dataframe, options):
        return import_immobilisations.importer_immobilisations(
            dataframe, dry_run=options["dry_run"], lignes_confirmees=options["lignes_confirmees"],
        )


class ImportFournituresView(_BaseImportStock):
    nom_import = "fournitures"
    module = import_fournitures

    def avant_lecture(self, fichier, options):
        options["date_import"] = import_fournitures.detecter_date_import(
            fichier, feuille=options["feuille"], ligne_entete=options["ligne_entete"]
        )

    def importer(self, dataframe, options):
        return import_fournitures.importer_fournitures(
            dataframe,
            dry_run=options["dry_run"],
            lignes_confirmees=options["lignes_confirmees"],
            date_import=options["date_import"],
            ligne_entete=options["ligne_entete"],
        )
