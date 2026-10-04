from django.db import transaction
from rest_framework import serializers

from apps.commande.models import AttributionDetailCommande, Commande, DetailCommande
from apps.commande.utils import format_employee_data
from apps.employee.models import Employer
from apps.stock.models import Affectation

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
        read_only_fields = ["date_commande", "date_traitement", "employe_traitant"]  # noqa: RUF012

    def get_demandeur(self, obj):
        return format_employee_data(obj.employe_demandeur)

    def get_traitant(self, obj):
        return format_employee_data(obj.employe_traitant)

    @transaction.atomic
    def create(self, validated_data):
        details_data = validated_data.pop("details", [])
        request = self.context.get("request")
        demandeur = validated_data.pop("employe_demandeur", None)

        if demandeur is None and request and request.user:
            demandeur = Employer.objects.filter(
                emp_utilisateur_id_id=getattr(request.user, "pk", None)
            ).first()

        if demandeur is None:
            raise serializers.ValidationError({
                "employe_demandeur": "L'identifiant de l'employé demandeur est requis."
            })

        commande = Commande.objects.create(
            employe_demandeur=demandeur, **validated_data
        )

        for detail_data in details_data:
            attributions_data = detail_data.pop("attributions", [])
            detail = DetailCommande.objects.create(commande=commande, **detail_data)
            for attribution_data in attributions_data:
                # Création directe (pas via AttributionDetailCommandeSerializer.
                # create()) : il faut donc résoudre l'affectation nous-mêmes ici.
                try:
                    affectation = Affectation.extraire_et_resoudre(
                        attribution_data, requis=True
                    )
                except ValueError as exc:
                    raise serializers.ValidationError(str(exc)) from exc
                AttributionDetailCommande.objects.create(
                    detail_commande=detail, affectation=affectation, **attribution_data
                )

        return commande