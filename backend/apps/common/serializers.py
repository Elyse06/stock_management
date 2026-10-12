from rest_framework import serializers

from apps.employee.models import Direction, Employer, Site
from apps.stock.models import Affectation, Salle

CHAMPS_BENEFICIAIRE = Affectation.CHAMPS_BENEFICIAIRE


class BeneficiaireWriteMixin(serializers.Serializer):
    employe_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Employer.objects.all(), required=False, allow_null=True, write_only=True
    )
    direction_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Direction.objects.all(), required=False, allow_null=True, write_only=True
    )
    salle_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Salle.objects.all(), required=False, allow_null=True, write_only=True
    )
    site_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Site.objects.all(), required=False, allow_null=True, write_only=True
    )

    message_plusieurs_beneficiaires = (
        "Un seul bénéficiaire autorisé : employé, direction, salle ou site."
    )

    def valider_beneficiaire_unique(self, attrs):
        valeurs = [attrs.get(champ) for champ in CHAMPS_BENEFICIAIRE if champ in attrs]
        if sum(valeur is not None for valeur in valeurs) > 1:
            raise serializers.ValidationError(self.message_plusieurs_beneficiaires)

    def beneficiaire_fourni(self):
        donnees = getattr(self, "initial_data", None) or {}
        return any(champ in donnees for champ in CHAMPS_BENEFICIAIRE)

    @staticmethod
    def extraire_affectation(data, requis=False):
        try:
            return Affectation.extraire_et_resoudre(data, requis=requis)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc
