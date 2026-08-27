from django.db import transaction
from rest_framework import serializers

from apps.commande.models import AttributionDetailCommande, Commande, DetailCommande
from apps.commande.utils import format_employee_data, generate_attribution_qr_payload
from apps.employee.models import Employer


class AttributionDetailCommandeSerializer(serializers.ModelSerializer):
    beneficiaire_nom = serializers.CharField(
        source="employe_beneficiaire.emp_nom", read_only=True
    )
    qr_code_data = serializers.SerializerMethodField()

    class Meta:
        model = AttributionDetailCommande
        fields = [
            "id",
            "employe_beneficiaire",
            "beneficiaire_nom",
            "quantite",
            "code_unique",
            "qr_code_data",
        ]
        read_only_fields = ["id", "code_unique", "qr_code_data"]

    def get_qr_code_data(self, obj):
        return generate_attribution_qr_payload(obj)


class DetailCommandeSerializer(serializers.ModelSerializer):
    article_designation = serializers.CharField(
        source="article.designation", read_only=True
    )
    attributions = AttributionDetailCommandeSerializer(many=True, required=False)

    class Meta:
        model = DetailCommande
        fields = [
            "id",
            "commande",
            "article",
            "article_designation",
            "quantite",
            "attributions",
        ]
        read_only_fields = ["commande"]

    def validate(self, attrs):
        quantite_totale = attrs.get("quantite", getattr(self.instance, "quantite", 0))
        attributions = attrs.get("attributions", [])

        if attributions:
            somme_attributions = sum(attr.get("quantite", 0) for attr in attributions)
            if somme_attributions > quantite_totale:
                raise serializers.ValidationError({
                    "attributions": (
                        f"La somme des attributions ({somme_attributions}) ne peut pas "
                        f"dépasser la quantité totale de l'article ({quantite_totale})."
                    )
                })
        return attrs


class CommandeSerializer(serializers.ModelSerializer):
    details = DetailCommandeSerializer(many=True, required=False)
    demandeur = serializers.SerializerMethodField()
    traitant = serializers.SerializerMethodField()

    class Meta:
        model = Commande
        fields = [
            "commande_id",
            "objet",
            "statut",
            "date_commande",
            "date_traitement",
            "commentaire_agent",
            "employe_demandeur",
            "demandeur",
            "employe_traitant",
            "traitant",
            "details",
        ]
        read_only_fields = ["date_commande", "date_traitement", "employe_traitant"]

    def get_demandeur(self, obj):
        return format_employee_data(obj.employe_demandeur)

    def get_traitant(self, obj):
        return format_employee_data(obj.employe_traitant)

    @transaction.atomic
    def create(self, validated_data):
        details_data = validated_data.pop("details", [])
        request = self.context.get("request")

        demandeur = validated_data.get("employe_demandeur")
        if demandeur is None and request and request.user:
            demandeur = Employer.objects.filter(
                emp_utilisateur_id_id=getattr(request.user, "pk", None)
            ).first()

        if demandeur is None:
            raise serializers.ValidationError({
                "employe_demandeur": "L'identifiant de l'employé demandeur est requis."
            })

        commande = Commande.objects.create(employe_demandeur=demandeur, **validated_data)

        for detail_data in details_data:
            attributions_data = detail_data.pop("attributions", [])
            detail = DetailCommande.objects.create(commande=commande, **detail_data)

            for attribution_data in attributions_data:
                AttributionDetailCommande.objects.create(
                    detail_commande=detail, **attribution_data
                )

        return commande