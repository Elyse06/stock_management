from apps.employee.models import Direction
from django.core.exceptions import ValidationError
from django.db import models

from .magasin import Magasin


class InventaireSession(models.Model):
    class Statut(models.TextChoices):
        EN_ATTENTE = "EN_ATTENTE", "En attente de validation"
        VALIDE = "VALIDE", "Validé (Stock mis à jour)"
        REJETE = "REJETE", "Rejeté"

    inventaire_id = models.BigAutoField(primary_key=True)
    code_reference = models.CharField(max_length=50, unique=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_validation = models.DateTimeField(null=True, blank=True)
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE)
    magasin = models.ForeignKey(
        Magasin, on_delete=models.CASCADE, null=True, blank=True, related_name="sessions_inventaire"
    )
    direction = models.ForeignKey(
        Direction, on_delete=models.CASCADE, null=True, blank=True, related_name="sessions_inventaire"
    )

    class Meta:
        db_table = 't_inventaire_session'
        verbose_name = "Session d'inventaire"
        verbose_name_plural = "Sessions d'inventaire"

    def clean(self):
        if not self.magasin and not self.direction:
            raise ValidationError("Veuillez sélectionner un endroit (Magasin ou Direction).")
        if self.magasin and self.direction:
            raise ValidationError("Veuillez choisir soit un Magasin, soit une Direction.")

    def __str__(self):
        lieu = self.magasin.magasin_nom if self.magasin else f"Direction {self.direction.dir_libelle}"
        return f"Inventaire {self.code_reference} ({lieu}) - {self.get_statut_display()}"
