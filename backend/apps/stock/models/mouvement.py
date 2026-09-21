from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from .magasin import Magasin


class Mouvement(models.Model):
    class Type(models.TextChoices):
        ENTREE = "ENTREE", "Entrée"
        SORTIE = "SORTIE", "Sortie"
        TRANSFERT = "TRANSFERT", "Transfert"
        AJUSTEMENT = "AJUSTEMENT", "Ajustement d'inventaire"
        RETOUR = "RETOUR", "Retour au stock"

    mouvement_id = models.BigAutoField(primary_key=True)
    date = models.DateTimeField(default=timezone.now)
    type_mouvement = models.CharField(max_length=20, choices=Type.choices)
    origine = models.CharField(max_length=100, blank=True)  # Ex: "Commande #12"
    motif = models.CharField(max_length=255, blank=True)

    magasin_source = models.ForeignKey(
        Magasin, on_delete=models.PROTECT, null=True, blank=True,
        related_name="mouvements_sortants",
    )
    magasin_destination = models.ForeignKey(
        Magasin, on_delete=models.PROTECT, null=True, blank=True,
        related_name="mouvements_entrants",
    )

    class Meta:
        db_table = "t_mouvement"
        verbose_name = "Mouvement"
        verbose_name_plural = "Mouvements"

    def clean(self):
        if self.type_mouvement == self.Type.ENTREE and not self.magasin_destination:
            raise ValidationError({"magasin_destination": "Requis pour une entrée."})

        if self.type_mouvement == self.Type.SORTIE and not self.magasin_source:
            raise ValidationError({"magasin_source": "Requis pour une sortie."})

        if self.type_mouvement == self.Type.TRANSFERT:
            if not self.magasin_source or not self.magasin_destination:
                raise ValidationError("Un transfert nécessite un magasin source ET destination.")
            if self.magasin_source == self.magasin_destination:
                raise ValidationError("Le magasin source et destination doivent être différents.")

        if self.type_mouvement == self.Type.RETOUR and not self.magasin_destination:
            raise ValidationError({
                "magasin_destination": "Requis pour un retour au stock."
            })

    def __str__(self):
        return f"Mouvement #{self.mouvement_id} ({self.get_type_mouvement_display()})"
