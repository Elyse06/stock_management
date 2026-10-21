from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

from apps.catalogue.models import Article
from apps.commande.access import (
    est_gestionnaire,
    est_validateur,
    filtrer_commandes_visibles,
    verifier_commande_modifiable,
)
from apps.commande.fiche_pdf import generer_accuse_reception
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


class FichesCommandes(BasePermission):
    """Accusé de réception : gestionnaire (toutes les commandes) ou chef hiérarchique (commandes de sa
    direction : la visibilité est appliquée par ``get_object``) ; commandes validées seulement."""

    message = "Seuls le gestionnaire et le chef hiérarchique peuvent télécharger les accusés de réception."

    def has_permission(self, request, view):
        return est_gestionnaire(request.user) or est_validateur(request.user)


class Gestionnaire(BasePermission):
    message = "Seul le gestionnaire du stock peut rattacher une demande de nouvel article à un article."

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

    @action(detail=True, methods=["post"], url_path="associer-article", permission_classes=[Gestionnaire])
    def associer_article(self, request, pk=None):
        """Rattache une ligne « nouvel article » (spécification) à un article du catalogue, créé pour
        l'occasion ou existant. La spécification d'origine est conservée."""
        commande = self.get_object()
        if commande.statut != Commande.Statut.EN_COURS:
            raise ValidationError({"detail": "Seule une commande en cours de validation finale peut être complétée."})
        detail = get_object_or_404(commande.details.all(), pk=request.data.get("detail_id"))
        if not detail.specification:
            raise ValidationError({"detail_id": "Cette ligne n'est pas une demande de nouvel article."})
        code = request.data.get("article")
        if not code:
            raise ValidationError({"article": "Choisissez l'article à rattacher."})
        article = Article.objects.filter(pk=code).first()
        if article is None:
            raise ValidationError({"article": f"L'article « {code} » n'existe pas."})
        detail.article = article
        detail.save(update_fields=["article"])
        return Response(self.get_serializer(self.get_queryset().get(pk=commande.pk)).data)

    @action(detail=True, methods=["get"], url_path="pdf", permission_classes=[FichesCommandes])
    def pdf(self, request, pk=None):
        commande = self.get_object()
        if commande.statut != Commande.Statut.VALIDEE:
            raise ValidationError({"detail": "L'accusé de réception n'existe que pour une commande validée."})
        return reponse_pdf(generer_accuse_reception(commande), f"accuse_reception_commande_{commande.pk}.pdf")

    @action(detail=True, methods=["get"], url_path="recapitulatif")
    def recapitulatif(self, request, pk=None):
        return Response(RecapitulatifCommandeSerializer(self.get_object(), context={"request": request}).data)
