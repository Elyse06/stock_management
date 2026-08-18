from decimal import Decimal

from django.test import TestCase

from apps.catalogue.models import Article, Categorie
from apps.stock.models import Magasin
from apps.stock.serializers import InventaireSerializer


class InventaireSerializerTest(TestCase):
    def test_create_inventory_line_with_article_and_store(self):
        categorie = Categorie.objects.create(nom="Consommable", description="")
        article = Article.objects.create(
            code_article="ART-001",
            code_barre="1234567890123",
            designation="Écran",
            description="",
            marque="",
            modele="",
            unite="pièce",
            categorie=categorie,
        )
        magasin = Magasin.objects.create(nom="Magasin central", localite="Antananarivo")

        payload = {
            "article": article.code_article,
            "magasin": magasin.magasin_id,
            "quantite_theorique": "5.00",
            "quantite_physique": "7.50",
        }

        serializer = InventaireSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        instance = serializer.save()
        self.assertEqual(instance.article, article)
        self.assertEqual(instance.magasin, magasin)
        self.assertEqual(instance.quantite_theorique, Decimal("5.00"))
        self.assertEqual(instance.quantite_physique, Decimal("7.50"))
