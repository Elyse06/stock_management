from django.db import models
from apps.catalogue.models import Article

# Create your models here.
class Magasin(models.Model):
    magasin_id = models.BigAutoField(primary_key=True)
    nom = models.CharField(max_length=20)
    localite = models.CharField(max_length=20, blank=True)

    class Meta:
        verbose_name = "Magasin"
        verbose_name_plural = "Magasins"

    def __str__(self):
        return self.nom


class Mouvement(models.Model):
    class Type(models.TextChoices):
        ENTREE = "ENTREE", "Entrée"
        SORTIE = "SORTIE", "Sortie"
        TRANSFERT = "TRANSFERT", "Transfert"
        INVENTAIRE = "INVENTAIRE", "Inventaire"

    mouvement_id = models.BigAutoField(primary_key=True)
    date = models.DateTimeField(auto_now_add=True)
    type_mouvement = models.CharField(max_length=20, choices=Type.choices)
    origine = models.CharField(max_length=50, blank=True)
    motif = models.CharField(max_length=50, blank=True)

    magasin_source = models.ForeignKey(
        Magasin,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="mouvements_sortants",
    )
    magasin_destination = models.ForeignKey(
        Magasin,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="mouvements_entrants",
    )

    class Meta:
        verbose_name = "Mouvement"
        verbose_name_plural = "Mouvements"

    def __str__(self):
        return f"Mouvement #{self.pk} ({self.type})"


class Inventaire(models.Model):
    article = models.ForeignKey(
        Article, on_delete=models.PROTECT, related_name="inventaires"
    )
    mouvement = models.ForeignKey(
        Mouvement, on_delete=models.CASCADE, related_name="inventaires", null=True, blank=True
    )
    magasin = models.ForeignKey(
        Magasin, on_delete=models.CASCADE, related_name="inventaires"
    )
    inventaire_id = models.BigAutoField(primary_key=True)
    quantite_theorique = models.DecimalField(max_digits=12, decimal_places=2)
    quantite_physique = models.DecimalField(max_digits=12, decimal_places=2)
    ecart = models.DecimalField(max_digits=12, decimal_places=2, editable=False, default=0)
    commentaire = models.TextField(blank=True, null=True)
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Inventaire"
        verbose_name_plural = "Inventaires"
        unique_together = ("mouvement", "article", "magasin")

    def save(self, *args, **kwargs):
        self.ecart = self.quantite_physique - self.quantite_theorique
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Inventaire {self.article} @ {self.magasin} ({self.date:%Y-%m-%d})"


class DetailMouvement(models.Model):
    mouvement = models.ForeignKey(
        Mouvement, on_delete=models.CASCADE, related_name="details"
    )
    article = models.ForeignKey(
        Article, on_delete=models.PROTECT, related_name="details_mouvement"
    )
    quantite = models.IntegerField()

    class Meta:
        verbose_name = "Détail mouvement"
        verbose_name_plural = "Détails mouvement"

    def __str__(self):
        return f"{self.article_id} x{self.quantite} (mvt {self.mouvement_id})"
