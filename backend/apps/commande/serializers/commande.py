from django.db import transaction
from rest_framework import serializers

from apps.commande.access import est_validateur
from apps.commande.models import AttributionDetailCommande, Commande, DetailCommande
from apps.common.employees import format_employee_data, get_request_employee
from apps.common.serializers import BeneficiaireWriteMixin
from apps.stock.models import Affectation

from .detail_commande import DetailCommandeSerializer


class CommandeSerializer(serializers.ModelSerializer):
    details = DetailCommandeSerializer(many=True, required=False)
    demandeur = serializers.SerializerMethodField()
    traitant = serializers.SerializerMethodField()
    prevalidateur_nom = serializers.CharField(source="employe_prevalidateur.emp_nom", read_only=True, default=None)

    class Meta:
        model = Commande
        fields = [  # noqa: RUF012
            "commande_id", "objet", "statut", "date_commande", "date_traitement", "commentaire_agent",
            "employe_demandeur", "demandeur", "employe_traitant", "traitant", "prevalidateur_nom",
            "date_prevalidation", "details",
        ]
        # Le statut et le commentaire ne changent que via l'action « traiter ».
        read_only_fields = [  # noqa: RUF012
            "statut", "date_commande", "date_traitement", "employe_traitant", "commentaire_agent",
            "date_prevalidation",
        ]
        extra_kwargs = {  # noqa: RUF012
            "employe_demandeur": {"required": False},
            "objet": {"required": True, "allow_blank": False, "max_length": 100},
        }

    def get_demandeur(self, obj):
        return format_employee_data(obj.employe_demandeur)

    def get_traitant(self, obj):
        return format_employee_data(obj.employe_traitant)

    def validate_objet(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Indiquez l'objet de la demande.")
        return value

    def validate_details(self, value):
        if self.instance is None and not value:
            raise serializers.ValidationError("Ajoutez au moins un article à la commande.")
        return value

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
            if not attributions_data:
                # Sans répartition, toute la quantité revient au demandeur : la ligne a ainsi une
                # attribution à valider (sinon elle était ignorée à la sortie de stock).
                AttributionDetailCommande.objects.create(
                    detail_commande=detail, affectation=Affectation.resoudre(demandeur),
                    quantite=detail.quantite, quantite_demandee=detail.quantite,
                )
        return commande
