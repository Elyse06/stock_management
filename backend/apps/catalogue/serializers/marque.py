from rest_framework import serializers

from apps.catalogue.models import Marque


class MarqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Marque
        fields = ["marque_id", "mq_libelle", "mq_descriprion"]  # noqa: RUF012
