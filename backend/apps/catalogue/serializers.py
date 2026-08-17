from rest_framework import serializers

from .models import Categorie, Article, Fournisseur, ArticleFournisseur


class CategorieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categorie
        fields = ["categorie_id", "nom", "description"]


class ArticleFournisseurSerializer(serializers.ModelSerializer):
    fournisseur_nom = serializers.CharField(source="fournisseur.nom", read_only=True)

    class Meta:
        model = ArticleFournisseur
        fields = ["id", "article", "fournisseur", "fournisseur_nom", "prix_achat"]


class ArticleSerializer(serializers.ModelSerializer):
    categorie_nom = serializers.CharField(source="categorie.nom", read_only=True)
    fournisseurs = ArticleFournisseurSerializer(
        source="fournisseurs_liaison", many=True, read_only=True
    )
    stock_calcule = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = [
            "code_article", "code_barre", "designation", "description",
            "marque", "modele", "unite", "mode_suivi",
            "categorie", "categorie_nom", "fournisseurs", "stock_calcule",
        ]

    def get_stock_calcule(self, obj):
        stock = 0
        for detail in obj.details_mouvement.select_related("mouvement"): 
            if detail.mouvement.type_mouvement == "ENTREE":
                stock += detail.quantite
            elif detail.mouvement.type_mouvement == "SORTIE":
                stock -= detail.quantite
        return stock

    def validate_code_barre(self, value):
        if value is not None and value.strip() == "":
            return None
        return value


class FournisseurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fournisseur
        fields = ["fournisseur_id", "nom", "email", "adresse", "contact"]
