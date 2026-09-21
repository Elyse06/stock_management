from apps.catalogue.models import Article, Fournisseur
from apps.employee.models import Direction, Employer
from django.core.exceptions import ValidationError
from django.db import models

from .mouvement import Mouvement


class DetailMouvement(models.Model):
    mouvement = models.ForeignKey(Mouvement, on_delete=models.CASCADE, related_name="details")
    article = models.ForeignKey(Article, on_delete=models.PROTECT, related_name="details_mouvement")
    quantite = models.PositiveIntegerField()

    employe_beneficiaire = models.ForeignKey(
        Employer, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="dotations_recues",
    )
    direction_beneficiaire = models.ForeignKey(
        Direction, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="dotations_recues",
    )
    fournisseur = models.ForeignKey(
        Fournisseur, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="details_mouvement_entree",
    )
    code_tracabilite = models.CharField(max_length=100, blank=True, null=True,)

    class Meta:
        db_table = "t_detail_mouvement"
        verbose_name = "Détail mouvement"
        verbose_name_plural = "Détails mouvement"
        constraints = [  # noqa: RUF012
            models.CheckConstraint(
                condition=(
                    models.Q(employe_beneficiaire__isnull=True, direction_beneficiaire__isnull=True) |
                    models.Q(employe_beneficiaire__isnull=False, direction_beneficiaire__isnull=True) |
                    models.Q(employe_beneficiaire__isnull=True, direction_beneficiaire__isnull=False)
                ),
                name='detail_mouv_at_most_one_beneficiary'
            )
        ]

    def clean(self):
        if self.employe_beneficiaire and self.direction_beneficiaire:
            raise ValidationError(
                "Un mouvement ne peut pas avoir un employé ET une direction bénéficiaire à la fois."
            )

    def __str__(self):
        return f"{self.article.designation} x{self.quantite} (mvt #{self.mouvement_id})"

    @property
    def employe_beneficiaire_nom(self):
        if self.employe_beneficiaire_id:
            return self.employe_beneficiaire.emp_nom
        return ""
    
    @property
    def employe_beneficiaire_matricule(self):
        if self.employe_beneficiaire_id:
            return self.employe_beneficiaire.emp_matricule
        return ""
    
    @property
    def employe_beneficiaire_fonction(self):
        if self.employe_beneficiaire_id:
            return self.employe_beneficiaire.emp_fonction
        return ""
    
    @property
    def beneficiaire_type(self):
        if self.employe_beneficiaire_id:
            return "EMPLOYE"
        if self.direction_beneficiaire_id:
            return "DIRECTION"
        return None
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
