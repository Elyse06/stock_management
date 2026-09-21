from rest_framework import serializers

from apps.commande.models import AttributionDetailCommande
from apps.commande.utils import generate_attribution_qr_payload
from apps.employee.models import Direction, Employer


class AttributionDetailCommandeSerializer(serializers.ModelSerializer):
    beneficiaire_nom = serializers.CharField(read_only=True)
    beneficiaire_type = serializers.CharField(read_only=True)
    employe_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Employer.objects.all(), required=False, allow_null=True
    )
    direction_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Direction.objects.all(), required=False, allow_null=True
    )
    qr_code_data = serializers.SerializerMethodField()
    date_acquisition = serializers.DateTimeField(read_only=True)

    class Meta:
        model = AttributionDetailCommande
        fields = [  # noqa: RUF012
            "id", "detail_commande",
            "employe_beneficiaire", "direction_beneficiaire",
            "beneficiaire_nom", "beneficiaire_type",
            "quantite", "quantite_demandee", "quantite_validee",
            "statut", "motif_refus",
            "code_unique", "date_acquisition", "qr_code_data",
        ]
        read_only_fields = ["id", "detail_commande", "code_unique", "qr_code_data", "date_acquisition"]  # noqa: RUF012

    def validate(self, attrs):
        employe = attrs.get(
            "employe_beneficiaire",
            getattr(self.instance, "employe_beneficiaire", None)
        )
        direction = attrs.get(
            "direction_beneficiaire",
            getattr(self.instance, "direction_beneficiaire", None)
        )
        if bool(employe) == bool(direction):
            raise serializers.ValidationError(
                "Choisir soit un employé, soit une direction bénéficiaire (l'un des deux)."
            )

        detail_commande = attrs.get(
            "detail_commande",
            getattr(self.instance, "detail_commande", None)
        )
        if detail_commande and not detail_commande.article.is_immobilisation and employe:
            raise serializers.ValidationError(
                "Une fourniture (non-immobilisation) ne peut être attribuée qu'à une direction."
            )
        return attrs

    def get_qr_code_data(self, obj):
        return generate_attribution_qr_payload(obj)
