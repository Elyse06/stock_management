from apps.employee.models import Direction
from apps.stock.models import (
    InventaireSession,
    LigneInventaire,
)
from apps.stock.utils import calculer_stock_theorique, generer_code_reference
from django.db import transaction
from rest_framework import serializers

from .ligne_inventaire import LigneInventaireSerializer


class InventaireSessionSerializer(serializers.ModelSerializer):
    lignes = LigneInventaireSerializer(many=True, required=False)
    lieu_nom = serializers.SerializerMethodField()
    service = serializers.PrimaryKeyRelatedField(
        queryset=Direction.objects.all(),
        source='direction', required=False, allow_null=True, write_only=True
    )
    service_libelle = serializers.CharField(
        source='direction.dir_libelle', read_only=True, default=None
    )

    class Meta:
        model = InventaireSession
        fields = [  # noqa: RUF012
            "inventaire_id", "code_reference", "date_creation", "date_validation", "statut",
            "magasin", "service", "service_libelle", "lieu_nom", "lignes",
        ]
        read_only_fields = ["code_reference", "statut", "date_creation", "date_validation"]  # noqa: RUF012

    def get_lieu_nom(self, obj):
        if obj.magasin:
            return f"Magasin: {obj.magasin.magasin_nom}"
        if obj.direction:
            return f"Direction: {obj.direction.dir_libelle}"
        return "N/A"

    def validate(self, attrs):
        magasin = attrs.get("magasin", getattr(self.instance, "magasin", None))
        direction = attrs.get("direction", getattr(self.instance, "direction", None))

        if not magasin and not direction:
            raise serializers.ValidationError(
                "Veuillez sélectionner soit un Magasin, soit une Direction."
            )
        if magasin and direction:
            raise serializers.ValidationError(
                "Vous ne pouvez pas sélectionner un Magasin ET une Direction à la fois."
            )
        return attrs

    
    @transaction.atomic
    def create(self, validated_data):
        lignes_data = validated_data.pop("lignes", [])
        magasin = validated_data.get("magasin")
        direction = validated_data.get("direction")

        validated_data["code_reference"] = generer_code_reference()
        session = InventaireSession.objects.create(**validated_data)

        for ligne_data in lignes_data:
            article = ligne_data.get("article")
            stock_theorique = calculer_stock_theorique(
                article=article,
                magasin=magasin,
                direction=direction,
            )
            
            ligne_data["quantite_theorique"] = stock_theorique
            LigneInventaire.objects.create(session=session, **ligne_data)
        
        return session
