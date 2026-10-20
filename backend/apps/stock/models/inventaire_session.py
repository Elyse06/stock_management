from django.core.exceptions import ValidationError
from django.db import models

from apps.employee.models import Direction, Employer, Site

from .magasin import Magasin
from .salle import Salle


class InventaireSession(models.Model):
    class Statut(models.TextChoices):
        EN_ATTENTE = "EN_ATTENTE", "En attente de validation"
        VALIDE = "VALIDE", "Validé (Stock mis à jour)"
        REJETE = "REJETE", "Rejeté"

    class TypeArticles(models.TextChoices):
        IMMOBILISATION = "IMMOBILISATION", "Immobilisations"
        FOURNITURE = "FOURNITURE", "Fournitures"

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
    site = models.ForeignKey(
        Site, on_delete=models.CASCADE, null=True, blank=True, related_name="sessions_inventaire"
    )
    salle = models.ForeignKey(
        Salle, on_delete=models.CASCADE, null=True, blank=True, related_name="sessions_inventaire"
    )
    # Articles inventoriés : immobilisations ou fournitures (vide : sessions antérieures, tous types).
    type_articles = models.CharField(max_length=20, choices=TypeArticles.choices, blank=True, default="")
    # Signataires de la fiche PDF : qui a réalisé le comptage, qui l'a validé.
    realise_par = models.ForeignKey(Employer, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    valide_par = models.ForeignKey(Employer, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")

    class Meta:
        db_table = 't_inventaire_session'
        verbose_name = "Session d'inventaire"
        verbose_name_plural = "Sessions d'inventaire"

    def clean(self):
        lieux = [self.magasin_id, self.direction_id, self.site_id, self.salle_id]
        if sum(value is not None for value in lieux) != 1:
            raise ValidationError(
                "Veuillez sélectionner exactement un lieu : magasin, site, direction ou salle."
            )
        if self.site_id and self.site.site_type != "AGENCE":
            raise ValidationError(
                "Un inventaire direct par site est réservé aux agences; "
                "pour un siège, choisissez une direction ou une salle."
            )
    def __str__(self):
        if self.magasin:
            lieu = f"Magasin {self.magasin.magasin_nom}"
        elif self.direction:
            lieu = f"Direction {self.direction.dir_libelle}"
        elif self.site:
            lieu = f"Site {self.site.site_nom}"
        else:
            lieu = f"Salle {self.salle.nom}"
        return f"Inventaire {self.code_reference} ({lieu}) - {self.get_statut_display()}"
