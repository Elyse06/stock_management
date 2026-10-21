from rest_framework import serializers

from apps.commande.models import Commande
from apps.common.employees import format_employee_data

from .recap_detail import RecapitulatifDetailCommandeSerializer


class RecapitulatifCommandeSerializer(serializers.ModelSerializer):
    demandeur = serializers.SerializerMethodField()
    details = RecapitulatifDetailCommandeSerializer(many=True, read_only=True)
    total_lignes = serializers.SerializerMethodField()
    total_demande = serializers.SerializerMethodField()
    total_valide = serializers.SerializerMethodField()
    total_refuse = serializers.SerializerMethodField()
    total_en_attente = serializers.SerializerMethodField()

    class Meta:
        model = Commande
        fields = [  # noqa: RUF012
            "commande_id", "objet", "statut", "date_commande", "demandeur", "commentaire_agent",
            "details", "total_lignes", "total_demande", "total_valide", "total_refuse", "total_en_attente",
        ]
        read_only_fields = fields

    @staticmethod
    def _attributions(obj):
        return [a for detail in obj.details.all() for a in detail.attributions.all()]

    def get_demandeur(self, obj):
        return format_employee_data(obj.employe_demandeur)

    def get_total_lignes(self, obj):
        return len(obj.details.all())

    def get_total_demande(self, obj):
        return sum((a.quantite_demandee for a in self._attributions(obj)), 0)

    def get_total_valide(self, obj):
        return sum(
            (a.quantite_validee or 0 for a in self._attributions(obj) if a.statut == "VALIDEE"), 0
        )

    def get_total_refuse(self, obj):
        return sum(1 for a in self._attributions(obj) if a.statut == "REFUSEE")

    def get_total_en_attente(self, obj):
        return sum(1 for a in self._attributions(obj) if a.statut == "EN_ATTENTE")
