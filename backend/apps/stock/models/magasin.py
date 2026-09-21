from apps.employee.models import Site
from django.db import models


class Magasin(models.Model):
    magasin_id = models.BigAutoField(primary_key=True)
    magasin_nom = models.CharField(max_length=50)
    localite = models.ForeignKey(
        Site, on_delete=models.PROTECT, null=True, blank=True,
        related_name="magasins",
    )

    class Meta:
        db_table = "t_magasin"
        verbose_name = "Magasin"
        verbose_name_plural = "Magasins"

    def __str__(self):
        site_nom = self.localite.site_nom if self.localite else "Sans site"
        return f"{self.magasin_nom} ({site_nom})"
