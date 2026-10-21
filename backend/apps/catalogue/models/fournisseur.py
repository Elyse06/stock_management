from django.db import models


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


