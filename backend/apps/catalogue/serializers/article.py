from rest_framework import serializers

from apps.catalogue.models import Article


class ArticleSerializer(serializers.ModelSerializer):
    categorie_nom = serializers.CharField(source="categorie.cat_libelle", read_only=True)
    # Nom complet de la catégorie (le libellé des catégories importées est une abréviation : « MB »).
    categorie_description = serializers.CharField(source="categorie.cat_description", read_only=True)
    stock_calcule = serializers.IntegerField(read_only=True)
    is_immobilisation = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = Article
        fields = [  # noqa: RUF012
            "code_article", "code_barre", "designation", "description",
            "modele", "unite", "seuil", "mode_suivi",
            "categorie", "categorie_nom", "categorie_description", "stock_calcule", "is_immobilisation",
        ]

    def validate_code_barre(self, value):
        if value is not None and not value.strip():
            return None
        return value.strip() if value else value
