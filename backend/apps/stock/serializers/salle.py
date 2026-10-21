from rest_framework import serializers

from apps.employee.models import Site
from apps.stock.models import Salle


class SalleSerializer(serializers.ModelSerializer):
    localite_nom = serializers.CharField(source="localite.site_nom", read_only=True)

    class Meta:
        model = Salle
        fields = ["salle_id", "nom", "localite", "localite_nom"]
        read_only_fields = ["salle_id", "localite_nom"]

    def validate_localite(self, value: Site) -> Site:
        if value.site_type != "SIEGE":
            raise serializers.ValidationError(
                "Une salle doit appartenir à un site de type Siège."
            )
        return value
