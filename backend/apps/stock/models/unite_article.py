from django.core.exceptions import ValidationError
from django.db import models

from apps.catalogue.models import Article

from .affectation import Affectation
from .detail_mouvement import DetailMouvement


class UniteArticle(models.Model):
    class Statut(models.TextChoices):
        EN_STOCK = "EN_STOCK", "En stock"
        ATTRIBUE = "ATTRIBUE", "Attribué"

    class Etat(models.TextChoices):
        BON = "BON", "Bon état"
        MOYEN = "MOYEN", "État moyen"
        MAUVAIS = "MAUVAIS", "Mauvais état"
        HORS_USAGE = "HORS_USAGE", "Hors usage"
        PERDU = "PERDU", "Perdu"

    unite_id = models.BigAutoField(primary_key=True)
    article = models.ForeignKey(Article, on_delete=models.PROTECT, related_name="unites")
    numero_de_serie = models.CharField(max_length=100, unique=True, null=True, blank=True)
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_STOCK)
    etat = models.CharField(max_length=20, choices=Etat.choices, default=Etat.BON)
    date_creation = models.DateTimeField(auto_now_add=True)
    mouvement_entree = models.ForeignKey(
        DetailMouvement, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="unites_creees",
    )
    mouvement_sortie = models.ForeignKey(
        DetailMouvement, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="unites_attribuees",
    )
    affectation = models.ForeignKey(
        Affectation, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="unites_attribuees",
    )

    class Meta:
        db_table = "t_unite_article"
        verbose_name = "Unité d'article"
        verbose_name_plural = "Unités d'articles"
        ordering = ["-date_creation"]  # noqa: RUF012
        indexes = [  # noqa: RUF012
            models.Index(fields=["article", "statut"]),
            models.Index(fields=["numero_de_serie"]),
        ]

    def __str__(self):
        identifiant = self.numero_de_serie or f"unité #{self.unite_id}"
        return f"{self.article.designation} - {identifiant} ({self.get_statut_display()})"

    def clean(self):
        if self.article_id and self.article.mode_suivi == self.article.ModeSuivi.NUMERO_SERIE:
            if not self.numero_de_serie:
                raise ValidationError({
                    "numero_de_serie": "Requis pour un article suivi par numéro de série."
                })
        elif self.numero_de_serie:
            raise ValidationError({
                "numero_de_serie": "Ne doit pas être renseigné pour un article suivi par quantité."
            })

        if self.statut == self.Statut.ATTRIBUE:
            if not self.affectation_id:
                raise ValidationError(
                    "Une unité ATTRIBUE doit avoir une affectation."
                )
        else:
            if self.affectation_id:
                raise ValidationError(
                    "Une unité EN_STOCK ne doit pas avoir d'affectation."
                )

    @property
    def employe_attribue(self):
        if self.affectation_id and self.affectation.beneficiaire_type == Affectation.BeneficiaireType.EMPLOYE:
            return self.affectation.employe.emp_id
        return None

    @property
    def employe_attribue_nom(self):
        return self.affectation.nom if self.affectation_id else ""

    @property
    def employe_attribue_matricule(self):
        if self.affectation_id and self.affectation.beneficiaire_type == Affectation.BeneficiaireType.EMPLOYE:
            return self.affectation.employe.emp_matricule
        return ""

    @property
    def beneficiaire_type(self):
        return self.affectation.beneficiaire_type if self.affectation_id else None

    def attribuer(self, beneficiaire, mouvement_sortie):
        """beneficiaire : un Employer, une Direction, une Salle ou un Site.
        Résout (ou crée) l'Affectation partagée correspondante."""
        self.affectation = Affectation.resoudre(beneficiaire)
        self.statut = self.Statut.ATTRIBUE
        if isinstance(mouvement_sortie, dict):
            pass
        else:
            self.mouvement_sortie = mouvement_sortie
        self.full_clean()
        self.save()

    def retourner_stock(self):
        self.statut = 'EN_STOCK'
        self.affectation = None
        self.mouvement_sortie = None
        self.full_clean()
        self.save()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)