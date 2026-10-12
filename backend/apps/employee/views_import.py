from apps.common import actions
from apps.common.imports import BaseImportView
from apps.common.params import parse_bool
from apps.common.permissions import HasAction

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
