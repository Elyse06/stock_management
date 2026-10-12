from django.test import TestCase

from apps.catalogue.models import Article
from apps.common.localisation import filtre_direction
from apps.common.stock import (
    MOTIF_ECART_POSITIF,
    annoter_stock,
    stock_article_beneficiaire,
    stock_article_magasin,
    stocks_articles_magasin,
    stocks_par_magasin,
)
from apps.stock.models import Affectation, Mouvement

from . import factories as f

T = Mouvement.Type


class CalculStockTests(TestCase):
    def setUp(self):
        self.art = f.article()
        self.m1 = f.magasin("M1")
        self.m2 = f.magasin("M2")
        f.mouvement(T.ENTREE, self.art, 10, destination=self.m1)
        f.mouvement(T.SORTIE, self.art, 3, source=self.m1)
        f.mouvement(T.TRANSFERT, self.art, 2, source=self.m1, destination=self.m2)
        f.mouvement(T.RETOUR, self.art, 1, destination=self.m2)
        f.mouvement(T.AJUSTEMENT, self.art, 4, destination=self.m1)  # écart positif
        f.mouvement(T.AJUSTEMENT, self.art, 1, source=self.m2)       # écart négatif

    def test_stock_par_magasin(self):
        self.assertEqual(stock_article_magasin(self.art, self.m1.pk), 10 - 3 - 2 + 4)
        self.assertEqual(stock_article_magasin(self.art, self.m2.pk), 2 + 1 - 1)

    def test_les_trois_methodes_concordent(self):
        groupes = stocks_par_magasin(self.art)
        for magasin in (self.m1, self.m2):
            attendu = stock_article_magasin(self.art, magasin.pk)
            self.assertEqual(groupes[magasin.pk], attendu)
            self.assertEqual(stocks_articles_magasin(magasin.pk)[self.art.pk], attendu)

    def test_stock_global_annule_les_transferts(self):
        stock = annoter_stock(Article.objects.filter(pk=self.art.pk)).get().stock_calcule
        self.assertEqual(stock, 9 + 2)

    def test_stock_beneficiaire(self):
        dir_ = f.direction()
        affectation = Affectation.pour_direction(dir_)
        f.mouvement(T.SORTIE, self.art, 5, source=self.m1, affectation=affectation)
        f.mouvement(T.RETOUR, self.art, 2, destination=self.m1, affectation=affectation)
        f.mouvement(T.AJUSTEMENT, self.art, 1, affectation=affectation, motif=MOTIF_ECART_POSITIF)
        self.assertEqual(stock_article_beneficiaire(self.art, filtre_direction(dir_.pk)), 5 - 2 + 1)
