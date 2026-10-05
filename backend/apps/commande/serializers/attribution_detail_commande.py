from rest_framework import serializers

from apps.commande.models import AttributionDetailCommande
from apps.commande.utils import generate_attribution_qr_payload
from apps.employee.models import Direction, Employer, Site
from apps.stock.models import Affectation, Salle


class AttributionDetailCommandeSerializer(serializers.ModelSerializer):
    beneficiaire_nom = serializers.CharField(read_only=True)
    beneficiaire_type = serializers.CharField(read_only=True)
    beneficiaire_id = serializers.SerializerMethodField()

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
    qr_code_data = serializers.SerializerMethodField()
    date_acquisition = serializers.DateTimeField(read_only=True)

    class Meta:
        model = AttributionDetailCommande
        fields = [  # noqa: RUF012
            "id", "detail_commande",
            "employe_beneficiaire", "direction_beneficiaire",
            "salle_beneficiaire", "site_beneficiaire",
            "beneficiaire_nom", "beneficiaire_type", "beneficiaire_id",
            "quantite", "quantite_demandee", "quantite_validee",
            "statut", "motif_refus",
            "code_unique", "date_acquisition", "qr_code_data",
        ]
        read_only_fields = ["id", "detail_commande", "code_unique", "qr_code_data", "date_acquisition"]  # noqa: RUF012

    def validate(self, attrs):
        # On ne peut pas se contenter de regarder attrs ici pour un update
        # partiel : si aucune des 4 clés n'est envoyée, le bénéficiaire
        # existant (via self.instance.affectation) reste valide.
        valeurs_fournies = [attrs.get(c) for c in Affectation.CHAMPS_BENEFICIAIRE if c in attrs]
        if sum(v is not None for v in valeurs_fournies) > 1:
            raise serializers.ValidationError(
                "Choisir soit un employé, soit une direction, soit une salle, soit un site bénéficiaire."
            )

        beneficiaire_fourni = any(c in attrs for c in Affectation.CHAMPS_BENEFICIAIRE)
        if self.instance is None and not beneficiaire_fourni:
            raise serializers.ValidationError(
                "Un bénéficiaire est requis : employé, direction, salle ou site."
            )

        detail_commande = attrs.get("detail_commande", getattr(self.instance, "detail_commande", None))
        employe = attrs.get("employe_beneficiaire")
        if detail_commande and not detail_commande.article.is_immobilisation and employe:
            raise serializers.ValidationError(
                "Une fourniture ne peut pas être attribuée à un employé."
            )
        return attrs

    def create(self, validated_data):
        try:
            affectation = Affectation.extraire_et_resoudre(validated_data, requis=True)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        validated_data["affectation"] = affectation
        return super().create(validated_data)

    def update(self, instance, validated_data):
        beneficiaire_fourni = any(
            c in self.initial_data for c in Affectation.CHAMPS_BENEFICIAIRE
        )
        try:
            affectation = Affectation.extraire_et_resoudre(validated_data)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        if beneficiaire_fourni:
            if affectation is None:
                raise serializers.ValidationError(
                    "Impossible de retirer le bénéficiaire : "
                    "fournissez-en un nouveau pour le remplacer."
                )
            validated_data["affectation"] = affectation
        return super().update(instance, validated_data)

    def get_qr_code_data(self, obj):
        return generate_attribution_qr_payload(obj)

    def get_beneficiaire_id(self, obj):
        affectation = obj.affectation
        return {
            Affectation.BeneficiaireType.EMPLOYE: affectation.employe_id,
            Affectation.BeneficiaireType.DIRECTION: affectation.direction_id,
            Affectation.BeneficiaireType.SALLE: affectation.salle_id,
            Affectation.BeneficiaireType.SITE: affectation.site_id,
        }[affectation.beneficiaire_type]