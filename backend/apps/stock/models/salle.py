from django.core.exceptions import ValidationError
from django.db import models

from apps.employee.models import Site


class Salle(models.Model):
    salle_id = models.BigAutoField(primary_key=True)
    nom = models.CharField(max_length=100)
    localite = models.ForeignKey(Site, on_delete=models.PROTECT, related_name="salles")

    class Meta:
        db_table = "t_salle"
        verbose_name = "Salle"
        verbose_name_plural = "Salles"
        constraints = [  # noqa: RUF012
            models.UniqueConstraint(fields=["nom", "localite"], name="salle_unique"),
        ]

    def clean(self):
        if self.localite_id and self.localite.site_type != "SIEGE":
            raise ValidationError({
                "localite": "Une salle doit appartenir à un site de type Siège."
            })

    def __str__(self):
        return f"{self.nom} ({self.localite.site_nom})"

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)