from django.db import models


class DemandeUnite(models.Model):
    """Demande d'un bénéficiaire : retour en stock ou transfert d'une unité qu'il détient.

    Le gestionnaire du stock la traite en effectuant le retour ou le transfert (la demande est
    alors clôturée dans la même transaction), ou la refuse.
    """

    class Type(models.TextChoices):
        RETOUR = "RETOUR", "Retour en stock"
        TRANSFERT = "TRANSFERT", "Transfert"

    class Statut(models.TextChoices):
        EN_ATTENTE = "EN_ATTENTE", "En attente"
        TRAITEE = "TRAITEE", "Traitée"
        REFUSEE = "REFUSEE", "Refusée"
        ANNULEE = "ANNULEE", "Annulée"

    demande_id = models.AutoField(primary_key=True)
    type_demande = models.CharField(max_length=20, choices=Type.choices)
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE)
    unite = models.ForeignKey("stock.UniteArticle", on_delete=models.CASCADE, related_name="demandes")
    demandeur = models.ForeignKey("employee.Employer", on_delete=models.SET_NULL, null=True, related_name="demandes_unites")
    # Bénéficiaire au moment de la demande, et nouveau bénéficiaire proposé (transfert).
    affectation_origine = models.ForeignKey("stock.Affectation", on_delete=models.PROTECT, related_name="+")
    nouvelle_affectation = models.ForeignKey("stock.Affectation", on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    motif = models.TextField(blank=True)
    date_demande = models.DateTimeField(auto_now_add=True)
    date_traitement = models.DateTimeField(null=True, blank=True)
    traitant = models.ForeignKey("employee.Employer", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    commentaire_traitement = models.TextField(blank=True)
    mouvement = models.ForeignKey("stock.Mouvement", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")

    class Meta:
        db_table = "t_demande_unite"
        ordering = ["-date_demande"]  # noqa: RUF012
        constraints = [  # noqa: RUF012
            models.UniqueConstraint(
                fields=["unite"], condition=models.Q(statut="EN_ATTENTE"), name="demande_unite_une_en_attente",
            ),
        ]

    def __str__(self):
        return f"Demande #{self.demande_id} ({self.get_type_demande_display()})"
