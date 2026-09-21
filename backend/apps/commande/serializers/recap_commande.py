from rest_framework import serializers

from apps.commande.models import AttributionDetailCommande, Commande
from apps.commande.utils import format_employee_data

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
            'commande_id', 'objet', 'statut', 'date_commande', 'demandeur', 'commentaire_agent',
            'details', 'total_lignes', 'total_demande', 'total_valide', 'total_refuse', 'total_en_attente',
        ]
        read_only_fields = fields

    def get_demandeur(self, obj):
        return format_employee_data(obj.employe_demandeur)

    def get_total_lignes(self, obj):
        return obj.details.count()

    def get_total_demande(self, obj):
        from django.db.models import Sum
        result = AttributionDetailCommande.objects.filter(
            detail_commande__commande=obj
        ).aggregate(total=Sum('quantite_demandee'))
        return result['total'] or 0

    def get_total_valide(self, obj):
        from django.db.models import Sum
        result = AttributionDetailCommande.objects.filter(
            detail_commande__commande=obj,
            statut='VALIDEE'
        ).aggregate(total=Sum('quantite_validee'))
        return result['total'] or 0

    def get_total_refuse(self, obj):
        return AttributionDetailCommande.objects.filter(
            detail_commande__commande=obj,
            statut='REFUSEE'
        ).count()

    def get_total_en_attente(self, obj):
        return AttributionDetailCommande.objects.filter(
            detail_commande__commande=obj,
            statut='EN_ATTENTE'
        ).count()
