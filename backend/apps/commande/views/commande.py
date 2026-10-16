from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

from apps.commande.access import (
    est_gestionnaire,
    filtrer_commandes_visibles,
    verifier_commande_modifiable,
)
from apps.commande.fiche_pdf import generer_fiche_commande
from apps.commande.models import Commande
from apps.commande.serializers import (
    CommandeSerializer,
    CommandeTraitementSerializer,
    RecapitulatifCommandeSerializer,
)
from apps.commande.utils import QR_SELECT_RELATED
from apps.common import actions
from apps.common.pdf import reponse_pdf
from apps.common.permissions import HasAction

from .permissions import CommandePermission

_EMPLOYE = ("emp_serv_id__serv_dir_id", "emp_dir_id", "emp_site_id")


class EstGestionnaireCommandes(BasePermission):
    """Fiche PDF réservée au gestionnaire (droits « Valider commande » ET « Gérer catalogue »)."""

    message = "Seul le gestionnaire peut télécharger les fiches des commandes."

    def has_permission(self, request, view):
        return est_gestionnaire(request.user)


class CommandeViewSet(viewsets.ModelViewSet):
    serializer_class = CommandeSerializer
    permission_classes = [CommandePermission]  # noqa: RUF012
    filter_backends = [DjangoFilterBackend]  # noqa: RUF012
    filterset_fields = ["statut", "employe_demandeur"]  # noqa: RUF012

    def get_queryset(self):
        queryset = (
            Commande.objects.select_related(
                *(f"employe_demandeur__{chemin}" for chemin in _EMPLOYE),
                *(f"employe_traitant__{chemin}" for chemin in _EMPLOYE),
            )
            .prefetch_related(
                "details__article",
                *(f"details__attributions__{chemin}" for chemin in QR_SELECT_RELATED),
            )
            .order_by("pk")
        )
        return filtrer_commandes_visibles(queryset, self.request)

    def perform_update(self, serializer):
        verifier_commande_modifiable(serializer.instance, self.request)
        serializer.save()

    def perform_destroy(self, instance):
        verifier_commande_modifiable(instance, self.request)
        instance.delete()

    @action(detail=True, methods=["post"], permission_classes=[HasAction.for_actions(actions.COM_VAL)])
    def traiter(self, request, pk=None):
        serializer = CommandeTraitementSerializer(
            data=request.data, context={"commande": self.get_object(), "request": request},
        )
        serializer.is_valid(raise_exception=True)
        commande = serializer.save()
        commande = self.get_queryset().get(pk=commande.pk)
        return Response(self.get_serializer(commande).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="pdf", permission_classes=[EstGestionnaireCommandes])
    def pdf(self, request, pk=None):
        commande = self.get_object()
        return reponse_pdf(generer_fiche_commande(commande), f"commande_{commande.pk}.pdf")

    @action(detail=True, methods=["get"], url_path="recapitulatif")
    def recapitulatif(self, request, pk=None):
        return Response(RecapitulatifCommandeSerializer(self.get_object(), context={"request": request}).data)
