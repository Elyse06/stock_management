from django.db import models


class Categorie(models.Model):
    categorie_id = models.BigAutoField(primary_key=True)
    cat_libelle = models.CharField(max_length=20)
    cat_description = models.TextField(blank=True)

    class Meta:
        db_table = 't_categorie'
        verbose_name = "Catégorie"
        verbose_name_plural = "Catégories"

    def __str__(self):
        return self.cat_libelle
