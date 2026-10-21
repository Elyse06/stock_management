from django.db import transaction
from django.db.models import Prefetch
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.common import actions
from apps.common.permissions import HasAction
from apps.employee.models import Employer

from .acces import demander_envoi_acces, preparer_sans_mot_de_passe
from .models import Action, Autoriser, Utilisateur
from .serializers import ActionSerializer, AutoriserSerializer, UtilisateurSerializer

GestionUtilisateurs = HasAction.for_actions(actions.USR_GERE)


class UtilisateurViewSet(viewsets.ModelViewSet):
    serializer_class = UtilisateurSerializer
    permission_classes = [GestionUtilisateurs]  # noqa: RUF012
    filter_backends = [filters.SearchFilter]  # noqa: RUF012
    search_fields = ["utilisateur_mail"]  # noqa: RUF012

    def get_queryset(self):
        return Utilisateur.objects.prefetch_related(
            Prefetch("autoriser_set", queryset=Autoriser.objects.only(
                "id", "autoriser_utilisateur_id", "autoriser_action_id"
            )),
            Prefetch("employer_set", queryset=Employer.objects.select_related(
                "emp_dir_id", "emp_serv_id__serv_dir_id"
            )),
        ).order_by("utilisateur_id")

    def perform_update(self, serializer):
        # Empêche un administrateur de se retirer lui-même la gestion des utilisateurs.
        nouvelles_actions = serializer.validated_data.get("actions")
        if (
            serializer.instance.pk == self.request.user.pk
            and nouvelles_actions is not None
            and actions.USR_GERE not in nouvelles_actions
        ):
            raise ValidationError(
                {"actions": "Vous ne pouvez pas retirer votre propre droit de gestion des utilisateurs."}
            )
        serializer.save()

    @action(detail=True, methods=["post"], url_path="renvoyer-acces")
    def renvoyer_acces(self, request, pk=None):
        """Renvoie un nouveau mot de passe temporaire à un compte pas encore activé."""
        compte = self.get_object()
        if not compte.mdp_a_changer:
            raise ValidationError({"detail": "Ce compte est déjà activé : l'utilisateur a choisi son mot de passe."})
        with transaction.atomic():
            preparer_sans_mot_de_passe(compte)  # l'ancien mot de passe temporaire cesse de fonctionner
            compte.save(update_fields=["utilisateur_mdp", "mdp_a_changer", "acces_envoye_le"])
            demander_envoi_acces(compte)
        return Response({"detail": f"Un nouvel accès va être envoyé à {compte.utilisateur_mail}."}, status=status.HTTP_202_ACCEPTED)

    def perform_destroy(self, instance):
        if instance.pk == self.request.user.pk:
            raise ValidationError({"detail": "Vous ne pouvez pas supprimer votre propre compte."})
        instance.delete()


class AutoriserViewSet(viewsets.ModelViewSet):
    queryset = Autoriser.objects.order_by("pk")
    serializer_class = AutoriserSerializer
    permission_classes = [GestionUtilisateurs]  # noqa: RUF012


class ActionViewSet(viewsets.ReadOnlyModelViewSet):
    """Les actions sont des codes système (créés par ``seed_data``) : lecture seule."""

    queryset = Action.objects.order_by("action_id")
    serializer_class = ActionSerializer
    permission_classes = [GestionUtilisateurs]  # noqa: RUF012
