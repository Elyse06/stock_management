import logging

import pandas as pd  # type: ignore
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.employee.services_import.import_employees import importer_employes

logger = logging.getLogger("employee.import")
TAILLE_MAX_FICHIER = 10 * 1024 * 1024  # 10 Mo


class ImportEmployeesView(APIView):
    parser_classes = [MultiPartParser]  # noqa: RUF012

    def post(self, request, *args, **kwargs):
        fichier = request.FILES.get("fichier")
        if fichier is None:
            return Response(
                {"detail": "Aucun fichier reçu (champ attendu: 'fichier')."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not fichier.name.lower().endswith((".xlsx", ".xls", ".csv")):
            return Response(
                {"detail": "Format non supporté, seuls .xlsx/.xls/.csv sont acceptés."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if fichier.size > TAILLE_MAX_FICHIER:
            return Response(
                {"detail": "Fichier trop volumineux (max 10 Mo)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        dry_run = request.data.get("dry_run", "true").strip().lower() != "false"
        overwrite = request.data.get("overwrite", "true").strip().lower() != "false"
        feuille = request.data.get("feuille", 0)

        logger.info(
            "Début import employés | utilisateur=%s | fichier=%s | taille=%d octets | dry_run=%s",
            request.user, fichier.name, fichier.size, dry_run,
        )

        try:
            if fichier.name.lower().endswith(".csv"):
                df = pd.read_csv(fichier, encoding="utf-8", on_bad_lines="skip")
            else:
                df = pd.read_excel(fichier, sheet_name=feuille)
        except Exception as exc:
            logger.exception("Impossible de lire le fichier %s", fichier.name)
            return Response(
                {"detail": f"Impossible de lire le fichier : {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if df.empty:
            return Response(
                {"detail": "Le fichier ne contient aucune ligne de données."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rapport = importer_employes(df, overwrite=overwrite, dry_run=dry_run)
        logger.info(
            "Import terminé | utilisateur=%s | fichier=%s | dry_run=%s | ok=%s | erreurs=%s",
            request.user, fichier.name, dry_run, rapport["lignes_ok"], rapport["lignes_erreur"],
        )

        return Response(rapport, status=status.HTTP_200_OK)