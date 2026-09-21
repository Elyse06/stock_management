from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.catalogue.models import Article, Fournisseur
from apps.employee.models import Direction, Employer, Site


class Magasin(models.Model):
    magasin_id = models.BigAutoField(primary_key=True)
    magasin_nom = models.CharField(max_length=50)
    localite = models.ForeignKey(
        Site,
        on_delete=models.PROTECT,
        related_name="magasins",
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "t_magasin"
        verbose_name = "Magasin"
        verbose_name_plural = "Magasins"

    def __str__(self):
        site_nom = self.localite.site_nom if self.localite else "Sans site"
        return f"{self.magasin_nom} ({site_nom})"


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


class DetailMouvement(models.Model):
    mouvement = models.ForeignKey(
        Mouvement, on_delete=models.CASCADE, related_name="details"
    )
    article = models.ForeignKey(
        Article, on_delete=models.PROTECT, related_name="details_mouvement"
    )
    quantite = models.PositiveIntegerField()

    employe_beneficiaire = models.ForeignKey(
        Employer, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="dotations_recues",
    )
    direction_beneficiaire = models.ForeignKey(
        Direction, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="dotations_recues",
    )
    fournisseur = models.ForeignKey(
        Fournisseur,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="details_mouvement_entree",
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
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(employe_beneficiaire__isnull=True, direction_beneficiaire__isnull=True) |
                    models.Q(employe_beneficiaire__isnull=False, direction_beneficiaire__isnull=True) |
                    models.Q(employe_beneficiaire__isnull=True, direction_beneficiaire__isnull=False)
                ),
                name='detail_mouv_at_most_one_beneficiary'
            )
        ]

    def clean(self):
        if self.employe_beneficiaire and self.direction_beneficiaire:
            raise ValidationError(
                "Un mouvement ne peut pas avoir un employé ET une direction bénéficiaire à la fois."
            )

    def __str__(self):
        return f"{self.article.designation} x{self.quantite} (mvt #{self.mouvement_id})"

    @property
    def employe_beneficiaire_nom(self):
        if self.employe_beneficiaire_id:
            return self.employe_beneficiaire.emp_nom
        return ""
    
    @property
    def employe_beneficiaire_matricule(self):
        if self.employe_beneficiaire_id:
            return self.employe_beneficiaire.emp_matricule
        return ""
    
    @property
    def employe_beneficiaire_fonction(self):
        if self.employe_beneficiaire_id:
            return self.employe_beneficiaire.emp_fonction
        return ""
    
    @property
    def beneficiaire_type(self):
        if self.employe_beneficiaire_id:
            return "EMPLOYE"
        if self.direction_beneficiaire_id:
            return "DIRECTION"
        return None
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class UniteArticle(models.Model):
    class Statut(models.TextChoices):
        EN_STOCK = "EN_STOCK", "En stock"
        ATTRIBUE = "ATTRIBUE", "Attribué"

    class Etat(models.TextChoices):
        BON = "BON", "Bon état"
        MOYEN = "MOYEN", "État moyen"
        MAUVAIS = "MAUVAIS", "Mauvais état"
        HORS_USAGE = "HORS_USAGE", "Hors usage"
        PERDU = "PERDU", "Perdu"

    unite_id = models.BigAutoField(primary_key=True)
    article = models.ForeignKey(
        Article,
        on_delete=models.PROTECT,
        related_name="unites",
    )
    numero_de_serie = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
    )
    statut = models.CharField(
        max_length=20,
        choices=Statut.choices,
        default=Statut.EN_STOCK
    )
    etat = models.CharField(
        max_length=20,
        choices=Etat.choices,
        default=Etat.BON,
    )
    date_creation = models.DateTimeField(auto_now_add=True)
    
    mouvement_entree = models.ForeignKey(
        DetailMouvement,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="unites_creees",
    )
    
    mouvement_sortie = models.ForeignKey(
        DetailMouvement,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="unites_attribuees",
    )
    
    employe_beneficiaire = models.ForeignKey(
        Employer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="unites_attribuees",
    )
    direction_beneficiaire = models.ForeignKey(
        Direction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="unites_attribuees",
    )

    class Meta:
        db_table = "t_unite_article"
        verbose_name = "Unité d'article"
        verbose_name_plural = "Unités d'articles"
        ordering = ["-date_creation"]
        indexes = [
            models.Index(fields=["article", "statut"]),
            models.Index(fields=["numero_de_serie"]),
        ]

    def __str__(self):
        identifiant = self.numero_de_serie or f"unité #{self.unite_id}"
        return f"{self.article.designation} - {identifiant} ({self.get_statut_display()})"

        def clean(self):
            if self.article_id and self.article.mode_suivi == self.article.ModeSuivi.NUMERO_SERIE:
                if not self.numero_de_serie:
                    raise ValidationError({
                        "numero_de_serie": "Requis pour un article suivi par numéro de série."
                    })
            elif self.numero_de_serie:
                raise ValidationError({
                    "numero_de_serie": "Ne doit pas être renseigné pour un article suivi par quantité."
                })
            
            has_emp = self.employe_beneficiaire_id is not None
            has_dir = self.direction_beneficiaire_id is not None

            if self.statut == self.Statut.ATTRIBUE:
                if has_emp == has_dir:
                    raise ValidationError(
                        "Une unité ATTRIBUE doit avoir exactement un bénéficiaire : "
                        "un employé OU une direction (pas les deux, ni aucun)."
                    )
            else:
                if has_emp or has_dir:
                    raise ValidationError(
                        "Une unité EN_STOCK ne doit pas avoir de bénéficiaire."
                    )

    @property
    def employe_attribue(self):
        if self.employe_beneficiaire_id:
            return self.employe_beneficiaire.emp_id
        return None
    
    @property
    def employe_attribue_nom(self):
        if self.employe_beneficiaire_id:
            return self.employe_beneficiaire.emp_nom
        if self.direction_beneficiaire_id:
            return self.direction_beneficiaire.dir_libelle
        return ""
    
    @property
    def employe_attribue_matricule(self):
        if self.employe_beneficiaire_id:
            return self.employe_beneficiaire.emp_matricule
        return ""

    @property
    def beneficiaire_type(self):
        if self.employe_beneficiaire_id:
            return "EMPLOYE"
        if self.direction_beneficiaire_id:
            return "DIRECTION"
        return None

    def attribuer(self, beneficiaire, mouvement_sortie):
        if isinstance(beneficiaire, Employer):
            self.employe_beneficiaire = beneficiaire
            self.direction_beneficiaire = None
        elif isinstance(beneficiaire, Direction):
            self.direction_beneficiaire = beneficiaire
            self.employe_beneficiaire = None
        else:
            raise ValidationError("beneficiaire doit être un Employer ou une Direction.")
 
        self.statut = self.Statut.ATTRIBUE
        if isinstance(mouvement_sortie, dict):
            pass
        else:
            self.mouvement_sortie = mouvement_sortie
        self.full_clean()
        self.save()

    def retourner_stock(self):
        self.statut = 'EN_STOCK'
        self.employe_beneficiaire = None
        self.direction_beneficiaire = None
        self.mouvement_sortie = None
        self.full_clean()
        self.save()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


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
    direction = models.ForeignKey(
        Direction, on_delete=models.CASCADE, null=True, blank=True, related_name="sessions_inventaire"
    )

    class Meta:
        db_table = 't_inventaire_session'
        verbose_name = "Session d'inventaire"
        verbose_name_plural = "Sessions d'inventaire"

    def clean(self):
        if not self.magasin and not self.direction:
            raise ValidationError("Veuillez sélectionner un endroit (Magasin ou Direction).")
        if self.magasin and self.direction:
            raise ValidationError("Veuillez choisir soit un Magasin, soit une Direction.")

    def __str__(self):
        lieu = self.magasin.magasin_nom if self.magasin else f"Direction {self.direction.dir_libelle}"
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
    propositions_series = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Propositions de numéros de série",
        help_text=(
            "Stockage temporaire des propositions pour les articles suivis par numéro de série. "
            "Matérialisé uniquement à la validation de la session d'inventaire."
        )
    )

    class Meta:
        db_table = 't_ligne_inventaire'
        verbose_name = "Ligne d'inventaire"
        verbose_name_plural = "Lignes d'inventaire"
        unique_together = ("session", "article")

    def clean(self):
        super().clean()
        if self.propositions_series:
            if not isinstance(self.propositions_series, dict):
                raise ValidationError({
                    'propositions_series': "Doit être un objet JSON."
                })
            
            allowed_keys = {'ajouts', 'retraits', 'changements_etat'}
            invalid_keys = set(self.propositions_series.keys()) - allowed_keys
            if invalid_keys:
                raise ValidationError({
                    'propositions_series': f"Clés invalides : {invalid_keys}. Clés autorisées : {allowed_keys}"
                })
            
            for ajout in self.propositions_series.get('ajouts', []):
                if not isinstance(ajout, dict):
                    raise ValidationError({'propositions_series': "Chaque ajout doit être un objet."})
                if 'numero_serie' not in ajout or 'etat' not in ajout:
                    raise ValidationError({
                        'propositions_series': "Chaque ajout doit contenir 'numero_serie' et 'etat'."
                    })
                if ajout['etat'] not in UniteArticle.Etat.values:
                    raise ValidationError({
                        'propositions_series': f"État invalide : {ajout['etat']}"
                    })
            
            for retrait in self.propositions_series.get('retraits', []):
                if not isinstance(retrait, dict):
                    raise ValidationError({'propositions_series': "Chaque retrait doit être un objet."})
                if 'unite_id' not in retrait or 'numero_serie' not in retrait or 'etat' not in retrait:
                    raise ValidationError({
                        'propositions_series': "Chaque retrait doit contenir 'unite_id', 'numero_serie' et 'etat'."
                    })
                if retrait['etat'] not in [UniteArticle.Etat.HORS_USAGE, UniteArticle.Etat.PERDU]:
                    raise ValidationError({
                        'propositions_series': (
                            f"Un retrait doit avoir l'état 'HORS_USAGE' ou 'PERDU' (reçu : {retrait['etat']})."
                        )
                    })
            
            for changement in self.propositions_series.get('changements_etat', []):
                if not isinstance(changement, dict):
                    raise ValidationError({'propositions_series': "Chaque changement doit être un objet."})
                if 'unite_id' not in changement or 'numero_serie' not in changement or 'etat' not in changement:
                    raise ValidationError({
                        'propositions_series': "Chaque changement doit contenir 'unite_id', 'numero_serie' et 'etat'."
                    })
                if changement['etat'] in [UniteArticle.Etat.PERDU]:
                    raise ValidationError({
                        'propositions_series': (
                            "Un changement d'état ne peut pas être 'PERDU'. "
                            "Utilisez 'retraits' pour les unités perdues."
                        )
                    })

    def save(self, *args, **kwargs):
        self.ecart = self.quantite_physique - self.quantite_theorique
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.article.designation} (Théorique: {self.quantite_theorique}, Physique: {self.quantite_physique})"