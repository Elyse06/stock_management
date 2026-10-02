import uuid

from django.db import models

from apps.stock.models import Affectation


class AttributionDetailCommande(models.Model):
    detail_commande = models.ForeignKey("DetailCommande", on_delete=models.CASCADE, related_name="attributions")
    affectation = models.ForeignKey(
        Affectation, on_delete=models.PROTECT, related_name="attributions_articles",
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
                    ~models.Q(statut='VALIDEE') |
                    (models.Q(quantite_validee__isnull=False) & models.Q(quantite_validee__gt=0))
                ),
                name='attrib_validee_quantite_obligatoire'
            ),
        ]

    @property
    def beneficiaire(self):
        return self.affectation.cible

    def beneficiaire_nom(self):
        return self.affectation.nom

    def beneficiaire_type(self):
        return self.affectation.beneficiaire_type

    def get_qr_payload(self):
        article = self.detail_commande.article
        type_beneficiaire = self.affectation.beneficiaire_type

        if type_beneficiaire == Affectation.BeneficiaireType.EMPLOYE:
            beneficiaire_payload, agence_payload = self._payload_pour_employe()
        elif type_beneficiaire == Affectation.BeneficiaireType.DIRECTION:
            beneficiaire_payload, agence_payload = self._payload_pour_direction()
        elif type_beneficiaire == Affectation.BeneficiaireType.SALLE:
            beneficiaire_payload, agence_payload = self._payload_pour_salle()
        else:
            beneficiaire_payload, agence_payload = self._payload_pour_site()

        return {
            "code_unique": str(self.code_unique),
            "quantite": float(self.quantite),
            "type_beneficiaire": type_beneficiaire,
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
        employe = self.affectation.employe
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
        direction = self.affectation.direction
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

    def _payload_pour_salle(self):
        salle = self.affectation.salle
        site = salle.localite if salle else None

        beneficiaire_payload = {
            "salle_id": salle.salle_id if salle else None,
            "nom": salle.nom if salle else None,
        }
        agence_payload = {
            "site_type": site.get_site_type_display() if site else None,
            "site_nom": site.site_nom if site else None,
            "localite": site.localite if site else None,
            "direction": None,
            "service": None,
        }
        return beneficiaire_payload, agence_payload

    def _payload_pour_site(self):
        site = self.affectation.site

        beneficiaire_payload = {
            "site_id": site.site_id if site else None,
            "site_nom": site.site_nom if site else None,
            "site_type": site.get_site_type_display() if site else None,
            "localite": site.localite if site else None,
        }
        agence_payload = {
            "site_type": site.get_site_type_display() if site else None,
            "site_nom": site.site_nom if site else None,
            "localite": site.localite if site else None,
            "direction": None,
            "service": None,
        }
        return beneficiaire_payload, agence_payload

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)