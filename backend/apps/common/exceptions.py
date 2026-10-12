import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from django.db.models import ProtectedError, RestrictedError
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger("apps.errors")


def _detail_django(exc):
    if hasattr(exc, "message_dict"):
        return exc.message_dict
    return {"detail": exc.messages if len(exc.messages) > 1 else exc.messages[0]}


def exception_handler(exc, context):
    if isinstance(exc, DjangoValidationError):
        exc = ValidationError(_detail_django(exc))

    response = drf_exception_handler(exc, context)
    if response is not None:
        return response

    if isinstance(exc, ProtectedError | RestrictedError):
        return Response(
            {"detail": "Suppression impossible : cet élément est utilisé par d'autres données."},
            status=status.HTTP_409_CONFLICT,
        )
    if isinstance(exc, IntegrityError):
        logger.warning("Violation d'intégrité : %s", exc)
        return Response(
            {"detail": "Opération refusée : elle violerait une contrainte d'intégrité."},
            status=status.HTTP_409_CONFLICT,
        )

    vue = context.get("view")
    logger.exception("Erreur inattendue dans %s", vue.__class__.__name__ if vue else "?")
    return Response(
        {"detail": "Erreur interne du serveur."},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
