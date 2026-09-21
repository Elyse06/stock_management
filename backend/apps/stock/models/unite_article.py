from apps.catalogue.models import Article
from apps.employee.models import Direction, Employer
from django.core.exceptions import ValidationError
from django.db import models

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
    employe_beneficiaire = models.ForeignKey(
        Employer, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="unites_attribuees",
    )
    direction_beneficiaire = models.ForeignKey(
        Direction, on_delete=models.SET_NULL, null=True, blank=True,
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
            
            has_emp = self.employe_beneficiaire_id is not None
            has_dir = self.direction_beneficiaire_id is not None

            if self.statut == self.Statut.ATTRIBUE:
                if has_emp == has_dir:
                    raise ValidationError(
                        "Une unité ATTRIBUE doit avoir exactement un bénéficiaire : "
                        "un employé OU une direction (pas les deux, ni aucun)."
                    )
            else:
                if has_emp or has_dir:
                    raise ValidationError(
                        "Une unité EN_STOCK ne doit pas avoir de bénéficiaire."
                    )

    @property
    def employe_attribue(self):
        if self.employe_beneficiaire_id:
            return self.employe_beneficiaire.emp_id
        return None
    
    @property
    def employe_attribue_nom(self):
        if self.employe_beneficiaire_id:
            return self.employe_beneficiaire.emp_nom
        if self.direction_beneficiaire_id:
            return self.direction_beneficiaire.dir_libelle
        return ""
    
    @property
    def employe_attribue_matricule(self):
        if self.employe_beneficiaire_id:
            return self.employe_beneficiaire.emp_matricule
        return ""

    @property
    def beneficiaire_type(self):
        if self.employe_beneficiaire_id:
            return "EMPLOYE"
        if self.direction_beneficiaire_id:
            return "DIRECTION"
        return None

    def attribuer(self, beneficiaire, mouvement_sortie):
        if isinstance(beneficiaire, Employer):
            self.employe_beneficiaire = beneficiaire
            self.direction_beneficiaire = None
        elif isinstance(beneficiaire, Direction):
            self.direction_beneficiaire = beneficiaire
            self.employe_beneficiaire = None
        else:
            raise ValidationError("beneficiaire doit être un Employer ou une Direction.")
 
        self.statut = self.Statut.ATTRIBUE
        if isinstance(mouvement_sortie, dict):
            pass
        else:
            self.mouvement_sortie = mouvement_sortie
        self.full_clean()
        self.save()

    def retourner_stock(self):
        self.statut = 'EN_STOCK'
        self.employe_beneficiaire = None
        self.direction_beneficiaire = None
        self.mouvement_sortie = None
        self.full_clean()
        self.save()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
