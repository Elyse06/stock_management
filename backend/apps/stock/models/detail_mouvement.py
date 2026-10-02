from django.db import models

from apps.catalogue.models import Article, Fournisseur

from .affectation import Affectation
from .mouvement import Mouvement


class DetailMouvement(models.Model):
    mouvement = models.ForeignKey(Mouvement, on_delete=models.CASCADE, related_name="details")
    article = models.ForeignKey(Article, on_delete=models.PROTECT, related_name="details_mouvement")
    quantite = models.PositiveIntegerField()
    prix_achat = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    affectation = models.ForeignKey(
        Affectation, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="mouvements",
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

    def __str__(self):
        return f"{self.article.designation} x{self.quantite} (mvt #{self.mouvement_id})"

    @property
    def employe_beneficiaire_nom(self):
        if self.affectation_id and self.affectation.beneficiaire_type == Affectation.BeneficiaireType.EMPLOYE:
            return self.affectation.employe.emp_nom
        return ""

    @property
    def employe_beneficiaire_matricule(self):
        if self.affectation_id and self.affectation.beneficiaire_type == Affectation.BeneficiaireType.EMPLOYE:
            return self.affectation.employe.emp_matricule
        return ""

    @property
    def employe_beneficiaire_fonction(self):
        if self.affectation_id and self.affectation.beneficiaire_type == Affectation.BeneficiaireType.EMPLOYE:
            return self.affectation.employe.emp_fonction
        return ""

    @property
    def beneficiaire_type(self):
        return self.affectation.beneficiaire_type if self.affectation_id else None

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)