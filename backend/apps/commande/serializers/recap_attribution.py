from rest_framework import serializers

from apps.commande.models import AttributionDetailCommande


class RecapitulatifAttributionSerializer(serializers.ModelSerializer):
    beneficiaire_nom = serializers.CharField(read_only=True)
    beneficiaire_type = serializers.CharField(read_only=True)
    article_designation = serializers.CharField(
        source='detail_commande.article.designation',
        read_only=True
    )
    article_code = serializers.CharField(
        source='detail_commande.article.code_article',
        read_only=True
    )
    is_immobilisation = serializers.BooleanField(
        source='detail_commande.article.is_immobilisation',
        read_only=True
    )
    mode_suivi = serializers.CharField(
        source='detail_commande.article.mode_suivi',
        read_only=True
    )

    class Meta:
        model = AttributionDetailCommande
        fields = [  # noqa: RUF012
            'id', 'detail_commande', 'article_code', 'article_designation', 'is_immobilisation',
            'mode_suivi', 'beneficiaire_nom', 'beneficiaire_type', 'quantite', 'quantite_demandee',
            'quantite_validee', 'statut', 'motif_refus',
        ]
        read_only_fields = fields
