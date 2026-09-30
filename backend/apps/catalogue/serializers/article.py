from rest_framework import serializers

from apps.catalogue.models import Article


class ArticleSerializer(serializers.ModelSerializer):
    categorie_nom = serializers.CharField(source="categorie.cat_libelle", read_only=True)
    stock_calcule = serializers.IntegerField(read_only=True)
    is_immobilisation = serializers.BooleanField(required=False, default=True)
    
    class Meta:
        model = Article
        fields = [  # noqa: RUF012
            "code_article", "code_barre", "designation", "description",
            "modele", "unite", "seuil", "mode_suivi",
            "categorie", "categorie_nom", "stock_calcule","is_immobilisation",
        ]

    def validate_code_barre(self, value):
        if value is not None and value.strip() == "":
            return None
        return value
