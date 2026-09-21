import uuid

from django.core.exceptions import ValidationError
from django.db import models

from apps.employee.models import Direction, Employer


class AttributionDetailCommande(models.Model):
    detail_commande = models.ForeignKey(
        "DetailCommande", on_delete=models.CASCADE, related_name="attributions"
    )
    employe_beneficiaire = models.ForeignKey(
        Employer,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="attributions_articles",
    )
    direction_beneficiaire = models.ForeignKey(
        Direction,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="attributions_articles",
    )
    quantite = models.DecimalField(max_digits=12, decimal_places=2)

    code_unique = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    date_acquisition = models.DateTimeField(auto_now_add=True)

    quantite_demandee = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        verbose_name="Quantité demandée",
    )
    quantite_validee = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        verbose_name="Quantité validée",
    )
    statut = models.CharField(
        max_length=20,
        choices=[
            ('EN_ATTENTE', 'En attente'),
            ('VALIDEE', 'Validée'),
            ('REFUSEE', 'Refusée'),
        ],
        default='EN_ATTENTE',
    )
    motif_refus = models.CharField(
        max_length=255, null=True, blank=True,
        verbose_name="Motif de refus",
    )

    class Meta:
        db_table = "t_attribution_detail_commande"
        constraints = [  # noqa: RUF012
            models.CheckConstraint(
                condition=(
                    models.Q(employe_beneficiaire__isnull=False, direction_beneficiaire__isnull=True) |
                    models.Q(employe_beneficiaire__isnull=True, direction_beneficiaire__isnull=False)
                ),
                name='attrib_exactly_one_beneficiary'
            ),
            models.CheckConstraint(
                condition=(
                    ~models.Q(statut='VALIDEE') | 
                    (models.Q(quantite_validee__isnull=False) & models.Q(quantite_validee__gt=0))
                ),
                name='attrib_validee_quantite_obligatoire'
            ),
        ]

    def clean(self):
        if bool(self.employe_beneficiaire) == bool(self.direction_beneficiaire):
            raise ValidationError(
                "Choisir soit un employé, soit une direction (l'un des deux, pas les deux/aucun)."
            )

    @property
    def beneficiaire(self):
        return self.employe_beneficiaire or self.direction_beneficiaire

    def beneficiaire_nom(self):
        if self.employe_beneficiaire_id:
            return str(self.employe_beneficiaire.emp_nom)
        if self.direction_beneficiaire_id:
            return str(self.direction_beneficiaire.dir_libelle)
        return ""

    def beneficiaire_type(self):
        return "EMPLOYE" if self.employe_beneficiaire_id else "DIRECTION"

    def get_qr_payload(self):
        article = self.detail_commande.article

        if self.employe_beneficiaire:
            beneficiaire_payload, agence_payload = self._payload_pour_employe()
        else:
            beneficiaire_payload, agence_payload = self._payload_pour_direction()

        return {
            "code_unique": str(self.code_unique),
            "quantite": float(self.quantite),
            "type_beneficiaire": "EMPLOYE"
            if self.employe_beneficiaire
            else "DIRECTION",
            "beneficiaire": beneficiaire_payload,
            "agence": agence_payload,
            "acquisition": {
                "mois": self.date_acquisition.month,
                "annee": self.date_acquisition.year,
            },
            "article": {
                "code_article": article.code_article,
                "designation": article.designation,
            },
        }

    def _payload_pour_employe(self):
        employe = self.employe_beneficiaire
        service = employe.emp_serv_id if employe else None
        direction = service.serv_dir_id if service else None
        site = direction.site if direction else None

        beneficiaire_payload = {
            "emp_id": employe.emp_id if employe else None,
            "emp_nom": employe.emp_nom if employe else None,
            "emp_matricule": employe.emp_matricule if employe else None,
            "emp_fonction": employe.emp_fonction if employe else None,
        }
        agence_payload = {
            "site_type": site.get_site_type_display() if site else None,
            "site_nom": site.site_nom if site else None,
            "localite": site.localite if site else None,
            "direction": direction.dir_libelle if direction else None,
            "service": service.serv_libelle if service else None,
        }
        return beneficiaire_payload, agence_payload

    def _payload_pour_direction(self):
        direction = self.direction_beneficiaire
        site = direction.site if direction else None

        beneficiaire_payload = {
            "dir_id": direction.dir_id if direction else None,
            "dir_libelle": direction.dir_libelle if direction else None,
        }
        agence_payload = {
            "site_type": site.get_site_type_display() if site else None,
            "site_nom": site.site_nom if site else None,
            "localite": site.localite if site else None,
            "direction": direction.dir_libelle if direction else None,
            "service": None,  # pas de service précis, c'est la direction entière qui détient
        }
        return beneficiaire_payload, agence_payload

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
  