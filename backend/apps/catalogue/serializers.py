from rest_framework import serializers

from .models import Article, ArticleFournisseur, Categorie, Fournisseur, Marque


class CategorieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categorie
        fields = ["categorie_id", "cat_libelle", "cat_description"]


class MarqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Marque
        fields = ["marque_id", "mq_libelle", "mq_descriprion"]


class ArticleFournisseurSerializer(serializers.ModelSerializer):
    fournisseur_nom = serializers.CharField(source="fournisseur.nom", read_only=True)

    class Meta:
        model = ArticleFournisseur
        fields = ["id", "article", "fournisseur", "fournisseur_nom", "prix_achat"]


class ArticleSerializer(serializers.ModelSerializer):
    categorie_nom = serializers.CharField(source="categorie.cat_libelle", read_only=True)
    marque_libelle = serializers.CharField(source="marque.mq_libelle", read_only=True)
    fournisseurs = ArticleFournisseurSerializer(
        source="fournisseurs_liaison", many=True, read_only=True
    )
    stock_calcule = serializers.IntegerField(read_only=True)

    class Meta:
        model = Article
        fields = [
            "code_article", "code_barre", "designation", "description",
            "modele", "unite", "seuil", "mode_suivi",
            "categorie", "categorie_nom", "marque", "marque_libelle", "fournisseurs", "stock_calcule",
        ]

    def validate_code_barre(self, value):
        if value is not None and value.strip() == "":
            return None
        return value


class FournisseurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fournisseur
        fields = ["fournisseur_id", "nom", "email", "adresse", "contact", "nif", "stat"]
