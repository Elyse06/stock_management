from apps.common import actions
from apps.common.imports import BaseImportView
from apps.common.params import parse_bool
from apps.common.permissions import HasAction

from .services_import.import_emails import importer_emails
from .services_import.import_employees import importer_employes


class ImportEmployeesView(BaseImportView):
    permission_classes = [HasAction.for_actions(actions.USR_GERE)]  # noqa: RUF012
    extensions = (".xlsx", ".xls", ".csv")
    nom_import = "employés"

    def lire_options(self, request):
        options = super().lire_options(request)
        options["overwrite"] = parse_bool(request.data.get("overwrite"), default=True)
        return options

    def importer(self, dataframe, options):
        return importer_employes(
            dataframe, overwrite=options["overwrite"], dry_run=options["dry_run"]
        )


class ImportEmailsEmployesView(BaseImportView):
    """Adresses de connexion des employés : met à jour, rattache ou crée leur compte utilisateur."""

    permission_classes = [HasAction.for_actions(actions.USR_GERE)]  # noqa: RUF012
    extensions = (".xlsx", ".xls", ".csv")
    nom_import = "adresses électroniques"

    def lire_options(self, request):
        options = super().lire_options(request)
        options["overwrite"] = parse_bool(request.data.get("overwrite"), default=True)
        return options

    def importer(self, dataframe, options):
        return importer_emails(dataframe, overwrite=options["overwrite"], dry_run=options["dry_run"])

    def post(self, request, *args, **kwargs):
        reponse = super().post(request, *args, **kwargs)
        # La confirmation contient des mots de passe temporaires : jamais en cache.
        reponse["Cache-Control"] = "no-store"
        return reponse
