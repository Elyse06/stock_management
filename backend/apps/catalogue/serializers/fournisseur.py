from rest_framework import serializers

from apps.catalogue.models import ArticleFournisseur, Fournisseur


class FournisseurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fournisseur
        fields = ["fournisseur_id", "nom", "email", "adresse", "contact", "nif", "stat"]  # noqa: RUF012

class ArticleFournisseurSerializer(serializers.ModelSerializer):
    fournisseur_nom = serializers.CharField(source="fournisseur.nom", read_only=True)

    class Meta:
        model = ArticleFournisseur
        fields = ["id", "article", "fournisseur", "fournisseur_nom", "prix_achat"]  # noqa: RUF012
