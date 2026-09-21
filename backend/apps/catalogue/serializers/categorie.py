from rest_framework import serializers

from apps.catalogue.models import Categorie


class CategorieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categorie
        fields = ["categorie_id", "cat_libelle", "cat_description"]  # noqa: RUF012
