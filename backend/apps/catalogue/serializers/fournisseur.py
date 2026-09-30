from rest_framework import serializers

from apps.catalogue.models import Fournisseur


class FournisseurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fournisseur
        fields = ["fournisseur_id", "nom", "email", "adresse", "contact", "nif", "stat"]  # noqa: RUF012

