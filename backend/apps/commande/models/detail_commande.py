from django.db import models

from apps.catalogue.models import Article

from .commande import Commande


class DetailCommande(models.Model):
    commande = models.ForeignKey(
        Commande, on_delete=models.CASCADE, related_name="details"
    )
    article = models.ForeignKey(
        Article, on_delete=models.PROTECT, related_name="details_commande"
    )
    quantite = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "t_detail_commande"
        verbose_name = "Détail commande"
        verbose_name_plural = "Détails commande"

    def __str__(self):
        return f"{self.article_id} x{self.quantite} (cmd {self.commande_id})"
