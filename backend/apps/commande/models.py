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
        Employer, on_delete=models.PROTECT, related_name="attributions_articles"
    )
    quantite = models.DecimalField(max_digits=12, decimal_places=2)
    
    code_unique = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    date_acquisition = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 't_attribution_detail_commande'

    def get_qr_payload(self):
        employe = self.employe_beneficiaire
        service = employe.emp_serv_id if employe else None
        direction = service.serv_dir_id if service else None
        site = direction.site if direction else None

        return {
            "code_unique": str(self.code_unique),
            "quantite": float(self.quantite),
            "beneficiaire": {
                "emp_id": employe.emp_id if employe else None,
                "emp_nom": employe.emp_nom if employe else None,
                "emp_matricule": employe.emp_matricule if employe else None,
                "emp_fonction": employe.emp_fonction if employe else None,
            },
            "agence": {
                "site_type": site.get_site_type_display() if site else None,
                "site_nom": site.site_nom if site else None,
                "localite": site.localite if site else None,
                "direction": direction.dir_libelle if direction else None,
                "service": service.serv_libelle if service else None,
            },
            "acquisition": {
                "mois": self.date_acquisition.month,
                "annee": self.date_acquisition.year,
            },
            "article": {
                "code_article": self.detail_commande.article.code_article,
                "designation": self.detail_commande.article.designation,
            },
        }