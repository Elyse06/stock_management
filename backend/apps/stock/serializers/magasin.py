from apps.stock.models import Magasin
from rest_framework import serializers


class MagasinSerializer(serializers.ModelSerializer):
    localite_nom = serializers.CharField(source="localite.site_nom", read_only=True, default=None)
    localite_type = serializers.CharField(source="localite.site_type", read_only=True, default=None)

    class Meta:
        model = Magasin
        fields = ["magasin_id", "magasin_nom", "localite", "localite_nom", "localite_type"]  # noqa: RUF012
