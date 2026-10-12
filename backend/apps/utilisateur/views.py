from django.db.models import Prefetch
from rest_framework import filters, viewsets
from rest_framework.exceptions import ValidationError

from apps.common import actions
from apps.common.permissions import HasAction
from apps.employee.models import Employer

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
