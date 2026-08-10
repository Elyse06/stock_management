from django.db import models

# Create your models here.
class Categorie(models.Model):
    categorie_id = models.BigAutoField(primary_key=True)
    nom = models.CharField(max_length=20)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = "Catégorie"
        verbose_name_plural = "Catégories"

    def __str__(self):
        return self.nom


class Article(models.Model):
    class ModeSuivi(models.TextChoices):
        QUANTITE = "QUANTITE", "Quantité simple"
        LOT = "LOT", "Suivi par lot"
        NUMERO_SERIE = "NUMERO_SERIE", "Suivi par numéro de série"

    code_article = models.CharField(max_length=20, primary_key=True)
    code_barre = models.CharField(max_length=100, unique=True, null=True, blank=True)
    designation = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    marque = models.CharField(max_length=30, blank=True)
    modele = models.CharField(max_length=30, blank=True)
    unite = models.CharField(max_length=20, blank=True)
    mode_suivi = models.CharField(
        max_length=20, choices=ModeSuivi.choices, default=ModeSuivi.QUANTITE
    )
    categorie = models.ForeignKey(
        Categorie, on_delete=models.PROTECT, related_name="articles"
    )

    class Meta:
        verbose_name = "Article"
        verbose_name_plural = "Articles"

    def __str__(self):
        return f"{self.code_article} - {self.designation}"


class Fournisseur(models.Model):
    fournisseur_id = models.BigAutoField(primary_key=True)
    nom = models.CharField(max_length=50)
    email = models.EmailField()
    adresse = models.CharField(max_length=50, blank=True)
    contact = models.CharField(max_length=20, blank=True)

    class Meta:
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
        verbose_name = "Article fournisseur"
        verbose_name_plural = "Articles fournisseurs"
        unique_together = ("article", "fournisseur")

    def __str__(self):
        return f"{self.article_id} @ {self.fournisseur} ({self.prix_achat})"
