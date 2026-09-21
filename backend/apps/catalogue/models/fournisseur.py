from django.db import models

from .article import Article


class Fournisseur(models.Model):
    fournisseur_id = models.BigAutoField(primary_key=True)
    nom = models.CharField(max_length=50)
    email = models.EmailField()
    adresse = models.CharField(max_length=50, blank=True)
    contact = models.CharField(max_length=20, blank=True)
    nif = models.CharField(max_length=20, blank=True)
    stat = models.CharField(max_length=20, blank=True)

    class Meta:
        db_table = 't_fournisseur'
        verbose_name = "Fournisseur"
        verbose_name_plural = "Fournisseurs"

    def __str__(self):
        return self.nom

class ArticleFournisseur(models.Model):
    article = models.ForeignKey(
        Article, on_delete=models.CASCADE, related_name="fournisseurs_liaison"
    )
    fournisseur = models.ForeignKey(
        Fournisseur, on_delete=models.CASCADE, related_name="articles_liaison"
    )
    prix_achat = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = 't_article_fournisseur'
        verbose_name = "Article fournisseur"
        verbose_name_plural = "Articles fournisseurs"
        unique_together = ("article", "fournisseur")

    def __str__(self):
        return f"{self.article_id} @ {self.fournisseur} ({self.prix_achat})"

