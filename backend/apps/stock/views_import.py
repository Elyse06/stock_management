import logging

import pandas as pd
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.stock.services_import.import_immobilisations import (
    detecter_index_entete,
    importer_immobilisations,
)

logger = logging.getLogger("stock.import")

TAILLE_MAX_FICHIER = 10 * 1024 * 1024  # 10 Mo


class ImportImmobilisationsView(APIView):
    parser_classes = [MultiPartParser]
    from apps.stock.permissions import HasImportImmobilisationsPermission
    permission_classes = [HasImportImmobilisationsPermission]

    def post(self, request, *args, **kwargs):
        fichier = request.FILES.get("fichier")
        if fichier is None:
            return Response(
                {"detail": "Aucun fichier reçu (champ attendu: 'fichier')."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not fichier.name.lower().endswith((".xlsx", ".xls")):
            return Response(
                {"detail": "Format non supporté, seul .xlsx/.xls est accepté."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if fichier.size > TAILLE_MAX_FICHIER:
            return Response(
                {"detail": "Fichier trop volumineux (max 10 Mo)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        dry_run = request.data.get("dry_run", "true").strip().lower() != "false"
        feuille = request.data.get("feuille", 0)
        ligne_entete_forcee = request.data.get("ligne_entete")

        logger.info(
            "Début import immobilisations | utilisateur=%s | fichier=%s | taille=%d octets | dry_run=%s",
            request.user,
            fichier.name,
            fichier.size,
            dry_run,
        )

        try:
            if ligne_entete_forcee is not None:
                ligne_entete = int(ligne_entete_forcee)
            else:
                ligne_entete = detecter_index_entete(fichier, feuille=feuille)
            df = pd.read_excel(fichier, sheet_name=feuille, header=ligne_entete)
        except ValueError as exc:
            logger.warning("Paramètre invalide pour l'import : %s", exc)
            return Response(
                {"detail": f"Paramètre invalide : {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            logger.exception("Impossible de lire le fichier Excel %s", fichier.name)
            return Response(
                {"detail": f"Impossible de lire le fichier Excel : {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if df.empty:
            logger.info("Fichier vide reçu par %s", request.user)
            return Response(
                {"detail": "Le fichier ne contient aucune ligne de données."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rapport = importer_immobilisations(df, dry_run=dry_run)
        rapport["ligne_entete_utilisee"] = ligne_entete + 1

        logger.info(
            "Import terminé | utilisateur=%s | fichier=%s | dry_run=%s | ok=%s | erreurs=%s",
            request.user,
            fichier.name,
            dry_run,
            rapport["lignes_ok"],
            rapport["lignes_erreur"],
        )

        if rapport["lignes_erreur"] > 0:
            logger.warning(
                "Import avec %s erreur(s) | utilisateur=%s | fichier=%s",
                rapport["lignes_erreur"],
                request.user,
                fichier.name,
            )

        return Response(rapport, status=status.HTTP_200_OK)