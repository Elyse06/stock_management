from rest_framework import serializers

from apps.commande.models import DetailCommande

from .recap_attribution import RecapitulatifAttributionSerializer


class RecapitulatifDetailCommandeSerializer(serializers.ModelSerializer):
    article_designation = serializers.CharField(
        source='article.designation', read_only=True
    )
    article_code = serializers.CharField(
        source='article.code_article', read_only=True
    )
    is_immobilisation = serializers.BooleanField(
        source='article.is_immobilisation', read_only=True
    )
    mode_suivi = serializers.CharField(
        source='article.mode_suivi', read_only=True
    )
    attributions = RecapitulatifAttributionSerializer(many=True, read_only=True)

    total_demande_ligne = serializers.SerializerMethodField()
    total_valide_ligne = serializers.SerializerMethodField()

    class Meta:
        model = DetailCommande
        fields = [  # noqa: RUF012
            'id', 'article', 'article_code', 'article_designation', 'is_immobilisation',
            'mode_suivi', 'quantite', 'attributions', 'total_demande_ligne', 'total_valide_ligne',
        ]
        read_only_fields = fields

    def get_total_demande_ligne(self, obj):
        from django.db.models import Sum
        result = obj.attributions.aggregate(
            total=Sum('quantite_demandee')
        )
        return result['total'] or 0

    def get_total_valide_ligne(self, obj):
        from django.db.models import Sum
        result = obj.attributions.filter(statut='VALIDEE').aggregate(
            total=Sum('quantite_validee')
        )
        return result['total'] or 0
