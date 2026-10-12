from rest_framework import serializers

from apps.commande.models import AttributionDetailCommande
from apps.commande.utils import generate_attribution_qr_payload
from apps.common.serializers import CHAMPS_BENEFICIAIRE, BeneficiaireWriteMixin


class AttributionDetailCommandeSerializer(BeneficiaireWriteMixin, serializers.ModelSerializer):
    beneficiaire_nom = serializers.CharField(read_only=True)
    beneficiaire_type = serializers.CharField(read_only=True)
    beneficiaire_id = serializers.SerializerMethodField()
    qr_code_data = serializers.SerializerMethodField()
    date_acquisition = serializers.DateTimeField(read_only=True)

    message_plusieurs_beneficiaires = (
        "Choisir soit un employé, soit une direction, soit une salle, soit un site bénéficiaire."
    )

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
        read_only_fields = [  # noqa: RUF012
            "id", "detail_commande", "code_unique", "qr_code_data", "date_acquisition",
            "statut", "quantite_validee", "motif_refus",
        ]

    def validate(self, attrs):
        self.valider_beneficiaire_unique(attrs)
        if self.instance is None and not any(c in attrs for c in CHAMPS_BENEFICIAIRE):
            raise serializers.ValidationError(
                "Un bénéficiaire est requis : employé, direction, salle ou site."
            )
        detail = attrs.get("detail_commande", getattr(self.instance, "detail_commande", None))
        if detail and not detail.article.is_immobilisation and attrs.get("employe_beneficiaire"):
            raise serializers.ValidationError("Une fourniture ne peut pas être attribuée à un employé.")
        return attrs

    def create(self, validated_data):
        validated_data["affectation"] = self.extraire_affectation(validated_data, requis=True)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        fourni = self.beneficiaire_fourni()
        affectation = self.extraire_affectation(validated_data)
        if fourni:
            if affectation is None:
                raise serializers.ValidationError(
                    "Impossible de retirer le bénéficiaire : fournissez-en un nouveau pour le remplacer."
                )
            validated_data["affectation"] = affectation
        return super().update(instance, validated_data)

    def get_qr_code_data(self, obj):
        return generate_attribution_qr_payload(obj)

    def get_beneficiaire_id(self, obj):
        cible = obj.affectation.cible
        return cible.pk if cible else None
