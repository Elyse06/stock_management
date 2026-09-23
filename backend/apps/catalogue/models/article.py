from django.db import models

from .categorie import Categorie
from .marque import Marque


class Article(models.Model):
    class ModeSuivi(models.TextChoices):
        QUANTITE = "QUANTITE", "Quantité simple"
        NUMERO_SERIE = "NUMERO_SERIE", "Suivi par numéro de série"

    code_article = models.CharField(max_length=20, primary_key=True)
    code_barre = models.CharField(max_length=100, unique=True, null=True, blank=True)
    designation = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    modele = models.CharField(max_length=30, blank=True)
    unite = models.CharField(max_length=20, blank=True)
    seuil = models.PositiveIntegerField(default=0)
    mode_suivi = models.CharField(
        max_length=20, choices=ModeSuivi.choices, default=ModeSuivi.QUANTITE
    )
    categorie = models.ForeignKey(
        Categorie, on_delete=models.PROTECT, related_name="articles"
    )
    marque = models.ForeignKey(
        Marque, on_delete=models.PROTECT, related_name="articles", null=True, blank=True
    )
    is_immobilisation = models.BooleanField(
        default=True,
    )

    class Meta:
        db_table = 't_article'
        verbose_name = "Article"
        verbose_name_plural = "Articles"

    def __str__(self):
        return f"{self.code_article} - {self.designation}"
    