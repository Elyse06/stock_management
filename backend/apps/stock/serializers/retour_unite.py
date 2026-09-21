from apps.stock.models import Magasin, UniteArticle
from apps.stock.services import retourner_unite_au_stock
from rest_framework import serializers


class RetourUniteSerializer(serializers.Serializer):
    unite_id = serializers.IntegerField()
    magasin_destination = serializers.PrimaryKeyRelatedField(
        queryset=Magasin.objects.all()
    )
    motif = serializers.CharField(required=False, allow_blank=True, default="")
    
    def validate_unite_id(self, value):
        try:
            unite = UniteArticle.objects.get(unite_id=value)
        except UniteArticle.DoesNotExist:
            raise serializers.ValidationError(f"Unité #{value} introuvable.")
        
        if unite.statut != UniteArticle.Statut.ATTRIBUE:
            raise serializers.ValidationError(
                f"L'unité #{value} n'est pas attribuée."
            )
        
        if unite.etat == UniteArticle.Etat.PERDU:
            raise serializers.ValidationError(
                "Une unité marquée 'Perdu' ne peut pas être retournée."
            )
        
        return value
    
    def save(self, **kwargs):
        return retourner_unite_au_stock(
            unite_id=self.validated_data['unite_id'],
            magasin_destination=self.validated_data['magasin_destination'],
            motif=self.validated_data.get('motif', ''),
        )
