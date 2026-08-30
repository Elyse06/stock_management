from django.core.exceptions import ValidationError
from django.db import models

from apps.catalogue.models import Article
from apps.employee.models import Employer, Service


class Magasin(models.Model):
    magasin_id = models.BigAutoField(primary_key=True)
    magasin_nom = models.CharField(max_length=50)
    localite = models.CharField(max_length=50, blank=True)

    class Meta:
        db_table = "t_magasin"
        verbose_name = "Magasin"
        verbose_name_plural = "Magasins"

    def __str__(self):
        return self.magasin_nom


class Mouvement(models.Model):
    class Type(models.TextChoices):
        ENTREE = "ENTREE", "Entrée"
        SORTIE = "SORTIE", "Sortie"
        TRANSFERT = "TRANSFERT", "Transfert"
        AJUSTEMENT = "AJUSTEMENT", "Ajustement d'inventaire"

    mouvement_id = models.BigAutoField(primary_key=True)
    date = models.DateTimeField(auto_now_add=True)
    type_mouvement = models.CharField(max_length=20, choices=Type.choices)
    origine = models.CharField(max_length=100, blank=True)  # Ex: "Commande #12"
    motif = models.CharField(max_length=255, blank=True)

    magasin_source = models.ForeignKey(
        Magasin,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="mouvements_sortants",
    )
    magasin_destination = models.ForeignKey(
        Magasin,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="mouvements_entrants",
    )

    class Meta:
        db_table = "t_mouvement"
        verbose_name = "Mouvement"
        verbose_name_plural = "Mouvements"

    def clean(self):
        """Validation stricte des règles de gestion des mouvements."""
        if self.type_mouvement == self.Type.ENTREE and not self.magasin_destination:
            raise ValidationError({"magasin_destination": "Requis pour une entrée."})

        if self.type_mouvement == self.Type.SORTIE and not self.magasin_source:
            raise ValidationError({"magasin_source": "Requis pour une sortie."})

        if self.type_mouvement == self.Type.TRANSFERT:
            if not self.magasin_source or not self.magasin_destination:
                raise ValidationError("Un transfert nécessite un magasin source ET destination.")
            if self.magasin_source == self.magasin_destination:
                raise ValidationError("Le magasin source et destination doivent être différents.")

    def __str__(self):
        return f"Mouvement #{self.mouvement_id} ({self.get_type_mouvement_display()})"


class DetailMouvement(models.Model):
    mouvement = models.ForeignKey(
        Mouvement, on_delete=models.CASCADE, related_name="details"
    )
    article = models.ForeignKey(
        Article, on_delete=models.PROTECT, related_name="details_mouvement"
    )
    quantite = models.PositiveIntegerField()

    # Traçabilité spécifique aux SORTIES pour lier avec vos Commandes & Attributions
    employe_beneficiaire = models.ForeignKey(
        Employer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dotations_recues",
    )
    code_tracabilite = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    class Meta:
        db_table = "t_detail_mouvement"
        verbose_name = "Détail mouvement"
        verbose_name_plural = "Détails mouvement"

    def __str__(self):
        return f"{self.article.designation} x{self.quantite} (mvt #{self.mouvement_id})"


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
    service = models.ForeignKey(
        Service, on_delete=models.CASCADE, null=True, blank=True, related_name="sessions_inventaire"
    )

    class Meta:
        db_table = 't_inventaire_session'
        verbose_name = "Session d'inventaire"
        verbose_name_plural = "Sessions d'inventaire"

    def clean(self):
        if not self.magasin and not self.service:
            raise ValidationError("Veuillez sélectionner un endroit (Magasin ou Département).")
        if self.magasin and self.service:
            raise ValidationError("Veuillez choisir soit un Magasin, soit un Département.")

    def __str__(self):
        lieu = self.magasin.magasin_nom if self.magasin else f"Département {self.service.serv_libelle}"
        return f"Inventaire {self.code_reference} ({lieu}) - {self.get_statut_display()}"


class LigneInventaire(models.Model):
    session = models.ForeignKey(
        InventaireSession, on_delete=models.CASCADE, related_name="lignes"
    )
    article = models.ForeignKey(
        Article, on_delete=models.PROTECT, related_name="lignes_inventaire"
    )
    quantite_theorique = models.DecimalField(max_digits=12, decimal_places=2)
    quantite_physique = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ecart = models.DecimalField(max_digits=12, decimal_places=2, editable=False, default=0)
    commentaire = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 't_ligne_inventaire'
        verbose_name = "Ligne d'inventaire"
        verbose_name_plural = "Lignes d'inventaire"
        unique_together = ("session", "article")

    def save(self, *args, **kwargs):
        self.ecart = self.quantite_physique - self.quantite_theorique
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.article.designation} (Théorique: {self.quantite_theorique}, Physique: {self.quantite_physique})"
