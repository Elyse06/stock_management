from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.commande.models import Commande
from apps.commande.services import generer_sortie_stock_pour_commande
from apps.common.permissions import HasAction
from apps.employee.models import Employer
from apps.stock.models import Magasin


class CommandeTraitementSerializer(serializers.Serializer):
    statut = serializers.ChoiceField(
        choices=[
            Commande.Statut.EN_COURS,
            Commande.Statut.VALIDEE,
            Commande.Statut.REJETEE,
        ]
    )
    commentaire_agent = serializers.CharField(required=False, allow_blank=True)
    magasin_source = serializers.PrimaryKeyRelatedField(
        queryset=Magasin.objects.all(), required=False, allow_null=True
    )
    employe_traitant = serializers.PrimaryKeyRelatedField(
        queryset=Employer.objects.select_related("emp_utilisateur_id"), required=False
    )

    @transaction.atomic
    def save(self, **kwargs):
        commande = self.context["commande"]
        request = self.context.get("request")
        has_cat_gere = HasAction.for_actions("CAT_GERE")().has_permission(request, None)
        has_com_val = HasAction.for_actions("COM_VAL")().has_permission(request, None)
        status_actuel = commande.statut
        nouveau_statut = self.validated_data["statut"]

        if has_cat_gere and has_com_val:
            transitions_autorisees = {
                Commande.Statut.EN_COURS: [Commande.Statut.VALIDEE, Commande.Statut.REJETEE],
            }
        elif has_com_val:
            transitions_autorisees = {
                Commande.Statut.EN_ATTENTE: [Commande.Statut.EN_COURS, Commande.Statut.REJETEE]
            }
        else:
            transitions_autorisees = {}

        transitions_possibles = transitions_autorisees.get(status_actuel, [])
        if nouveau_statut not in transitions_possibles:
            raise serializers.ValidationError({
                "statut": f"Transition non autorisée : {status_actuel} -> {nouveau_statut}"
            })

        traitant = self.validated_data.get("employe_traitant")
        if traitant is None and request and request.user:
            traitant = Employer.objects.filter(
                emp_utilisateur_id_id=getattr(request.user, "pk", None)
            ).first()

        if traitant is None:
            raise serializers.ValidationError({"employe_traitant": "Employé traitant requis."})

        commande.statut = nouveau_statut
        commande.commentaire_agent = self.validated_data.get("commentaire_agent", "")
        commande.employe_traitant = traitant
        commande.date_traitement = timezone.now()
        commande.save()

        if nouveau_statut == Commande.Statut.VALIDEE:
            generer_sortie_stock_pour_commande(
                commande, 
                self.validated_data.get("magasin_source")
            )

        return commande