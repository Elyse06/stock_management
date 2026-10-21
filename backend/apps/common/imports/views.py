import logging

import pandas as pd
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.params import parse_bool, parse_int, parse_json_int_set, parse_sheet
from apps.common.throttling import ImportThrottle

from .uploads import TAILLE_MAX_DEFAUT, FichierInvalide, valider_fichier

logger = logging.getLogger("apps.imports")


class BaseImportView(APIView):
    parser_classes = [MultiPartParser]  # noqa: RUF012
    throttle_classes = [ImportThrottle]  # noqa: RUF012

    extensions: tuple = (".xlsx", ".xls")
    taille_max = TAILLE_MAX_DEFAUT
    nom_import = "fichier"

    def lire_options(self, request):
        return {
            "dry_run": parse_bool(request.data.get("dry_run"), default=True),
            "feuille": parse_sheet(request.data.get("feuille")),
            "ligne_entete": parse_int(request.data.get("ligne_entete"), minimum=0),
            "lignes_confirmees": parse_json_int_set(
                request.data.get("lignes_confirmees"), "lignes_confirmees"
            ),
        }

    def lire_dataframe(self, fichier, extension, options):
        if extension == ".csv":
            return pd.read_csv(fichier, encoding="utf-8", on_bad_lines="skip")
        return pd.read_excel(fichier, sheet_name=options["feuille"])

    def importer(self, dataframe, options):
        raise NotImplementedError

    def completer_rapport(self, rapport, options):
        return rapport

    def post(self, request, *args, **kwargs):
        fichier = request.FILES.get("fichier")
        try:
            extension = valider_fichier(fichier, self.extensions, self.taille_max)
        except FichierInvalide as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        options = self.lire_options(request)
        logger.info(
            "Début import %s | utilisateur=%s | fichier=%s | taille=%d octets | dry_run=%s",
            self.nom_import, request.user.pk, fichier.name, fichier.size, options["dry_run"],
        )

        try:
            dataframe = self.lire_dataframe(fichier, extension, options)
        except ValueError as exc:
            logger.warning("Paramètre invalide pour l'import %s : %s", self.nom_import, exc)
            return Response(
                {"detail": f"Paramètre invalide : {exc}"}, status=status.HTTP_400_BAD_REQUEST
            )
        except Exception:
            logger.exception("Lecture impossible du fichier %s", fichier.name)
            return Response(
                {"detail": "Impossible de lire le fichier. Vérifiez son format et son contenu."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if dataframe.empty:
            return Response(
                {"detail": "Le fichier ne contient aucune ligne de données."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            rapport = self.importer(dataframe, options)
        except ValueError as exc:
            # Prérequis global non rempli (ex. magasin du Siège introuvable).
            logger.error("Import %s impossible : %s", self.nom_import, exc)
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        rapport = self.completer_rapport(rapport, options)
        niveau = logging.WARNING if rapport.get("lignes_erreur") else logging.INFO
        logger.log(
            niveau,
            "Import %s terminé | utilisateur=%s | fichier=%s | dry_run=%s | ok=%s | erreurs=%s",
            self.nom_import, request.user.pk, fichier.name, options["dry_run"],
            rapport.get("lignes_ok"), rapport.get("lignes_erreur"),
        )
        return Response(rapport, status=status.HTTP_200_OK)
