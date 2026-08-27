import uuid

from django.db import models

from apps.catalogue.models import Article
from apps.employee.models import Employer


# Create your models here.
class Commande(models.Model):
    class Statut(models.TextChoices):
        EN_ATTENTE = "EN_ATTENTE", "En attente"
        EN_COURS = "EN_COURS", "En cours"
        VALIDEE = "VALIDEE", "Validée"
        REJETEE = "REJETEE", "Rejetée"

    commande_id = models.BigAutoField(primary_key=True)
    date_commande = models.DateTimeField(auto_now_add=True)
    objet = models.CharField(max_length=100, blank=True)
    statut = models.CharField(
        max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE
    )
    date_traitement = models.DateTimeField(null=True, blank=True)
    commentaire_agent = models.CharField(max_length=255, blank=True)

    employe_demandeur = models.ForeignKey(
        Employer, on_delete=models.PROTECT, related_name="commandes_demandees"
    )
    employe_traitant = models.ForeignKey(
        Employer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="commandes_traitees",
    )

    class Meta:
        db_table = 't_commande'
        verbose_name = "Commande"
        verbose_name_plural = "Commandes"

    def __str__(self):
        return f"Commande #{self.pk} ({self.statut})"


class DetailCommande(models.Model):
    commande = models.ForeignKey(
        Commande, on_delete=models.CASCADE, related_name="details"
    )
    article = models.ForeignKey(
        Article, on_delete=models.PROTECT, related_name="details_commande"
    )
    quantite = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = 't_detail_commande'
        verbose_name = "Détail commande"
        verbose_name_plural = "Détails commande"

    def __str__(self):
        return f"{self.article_id} x{self.quantite} (cmd {self.commande_id})"


class AttributionDetailCommande(models.Model):
    detail_commande = models.ForeignKey(
        'DetailCommande', on_delete=models.CASCADE, related_name="attributions"
    )
    employe_beneficiaire = models.ForeignKey(
        'Employer', on_delete=models.PROTECT, related_name="attributions_articles"
    )
    quantite = models.DecimalField(max_digits=12, decimal_places=2)
    
    code_unique = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    
    class Meta:
        db_table = 't_attribution_detail_commande'

    def get_qr_payload(self):
        return {
            "token": str(self.code_unique),
            "attribution_id": self.pk,
            "article": self.detail_commande.article.designation,
            "quantite": float(self.quantite),
            "beneficiaire": f"{self.employe_beneficiaire.emp_nom}",
            "matricule": self.employe_beneficiaire.emp_matricule,
        }