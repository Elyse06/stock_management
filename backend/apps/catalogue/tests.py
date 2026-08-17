from django.test import TestCase

from apps.catalogue.models import Article, Categorie
from apps.catalogue.serializers import ArticleSerializer
from apps.stock.models import DetailMouvement, Magasin, Mouvement


class ArticleStockCalculeTest(TestCase):
    def test_stock_calcule_uses_entrees_and_sorties(self):
        categorie = Categorie.objects.create(nom="Consommables", description="")
        article = Article.objects.create(
            code_article="A001",
            code_barre="123456789",
            designation="Produit test",
            categorie=categorie,
        )
        magasin = Magasin.objects.create(nom="Magasin principal", localite="Paris")

        entree_1 = Mouvement.objects.create(
            type_mouvement=Mouvement.Type.ENTREE,
            magasin_destination=magasin,
            origine="achat",
        )
        DetailMouvement.objects.create(mouvement=entree_1, article=article, quantite=10)

        entree_2 = Mouvement.objects.create(
            type_mouvement=Mouvement.Type.ENTREE,
            magasin_destination=magasin,
            origine="retour",
        )
        DetailMouvement.objects.create(mouvement=entree_2, article=article, quantite=5)

        sortie_1 = Mouvement.objects.create(
            type_mouvement=Mouvement.Type.SORTIE,
            magasin_source=magasin,
            origine="vente",
        )
        DetailMouvement.objects.create(mouvement=sortie_1, article=article, quantite=3)

        sortie_2 = Mouvement.objects.create(
            type_mouvement=Mouvement.Type.SORTIE,
            magasin_source=magasin,
            origine="perte",
        )
        DetailMouvement.objects.create(mouvement=sortie_2, article=article, quantite=2)

        data = ArticleSerializer(article).data

        self.assertEqual(data["stock_calcule"], 10)
