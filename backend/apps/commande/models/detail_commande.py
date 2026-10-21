from django.db import models

from apps.catalogue.models import Article

from .commande import Commande


class DetailCommande(models.Model):
    """Ligne de commande : un article du catalogue, ou un « nouvel article » décrit par une
    spécification (``article`` vide) que le gestionnaire rattache à un article avant la validation."""

    commande = models.ForeignKey(
        Commande, on_delete=models.CASCADE, related_name="details"
    )
    article = models.ForeignKey(
        Article, on_delete=models.PROTECT, related_name="details_commande", null=True, blank=True,
    )
    # Description libre du matériel souhaité quand il n'existe pas encore au catalogue ;
    # conservée après le rattachement (trace de la demande d'origine).
    specification = models.CharField(max_length=255, blank=True, default="")
    quantite = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "t_detail_commande"
        verbose_name = "Détail commande"
        verbose_name_plural = "Détails commande"
        constraints = [  # noqa: RUF012
            models.CheckConstraint(
                condition=models.Q(article__isnull=False) | ~models.Q(specification=""),
                name="detail_commande_article_ou_specification",
            ),
        ]

    def __str__(self):
        return f"{self.article_id or 'nouvel article'} x{self.quantite} (cmd {self.commande_id})"

    @property
    def est_nouvel_article(self):
        return bool(self.specification)

    @property
    def libelle(self):
        """Désignation de l'article, sinon « Nouvel article : <spécification> »."""
        if self.article_id:
            return self.article.designation
        return f"Nouvel article : {self.specification}"
