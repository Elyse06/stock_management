from django.db import transaction
from rest_framework import serializers

from apps.commande.access import est_validateur
from apps.commande.models import AttributionDetailCommande, Commande, DetailCommande
from apps.common.employees import format_employee_data, get_request_employee
from apps.common.serializers import BeneficiaireWriteMixin

from .detail_commande import DetailCommandeSerializer


class CommandeSerializer(serializers.ModelSerializer):
    details = DetailCommandeSerializer(many=True, required=False)
    demandeur = serializers.SerializerMethodField()
    traitant = serializers.SerializerMethodField()

    class Meta:
        model = Commande
        fields = [  # noqa: RUF012
            "commande_id", "objet", "statut", "date_commande", "date_traitement", "commentaire_agent",
            "employe_demandeur", "demandeur", "employe_traitant", "traitant", "details",
        ]
        read_only_fields = [  # noqa: RUF012
            "statut", "date_commande", "date_traitement", "employe_traitant", "commentaire_agent",
        ]
        extra_kwargs = {"employe_demandeur": {"required": False}}  # noqa: RUF012

    def get_demandeur(self, obj):
        return format_employee_data(obj.employe_demandeur)

    def get_traitant(self, obj):
        return format_employee_data(obj.employe_traitant)

    def validate_employe_demandeur(self, value):
        request = self.context.get("request")
        if request is None:
            return value
        if self.instance is not None and value != self.instance.employe_demandeur:
            raise serializers.ValidationError("Le demandeur d'une commande ne peut pas être changé.")
        employee = get_request_employee(request)
        if value is not None and not est_validateur(request.user) and value != employee:
            raise serializers.ValidationError("Vous ne pouvez créer une commande que pour vous-même.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        details_data = validated_data.pop("details", [])
        demandeur = validated_data.pop("employe_demandeur", None)
        request = self.context.get("request")
        if demandeur is None and request is not None:
            demandeur = get_request_employee(request)
        if demandeur is None:
            raise serializers.ValidationError(
                {"employe_demandeur": "L'identifiant de l'employé demandeur est requis."}
            )

        commande = Commande.objects.create(employe_demandeur=demandeur, **validated_data)
        for detail_data in details_data:
            attributions_data = detail_data.pop("attributions", [])
            detail = DetailCommande.objects.create(commande=commande, **detail_data)
            for attribution_data in attributions_data:
                affectation = BeneficiaireWriteMixin.extraire_affectation(attribution_data, requis=True)
                AttributionDetailCommande.objects.create(
                    detail_commande=detail, affectation=affectation, **attribution_data
                )
        return commande
