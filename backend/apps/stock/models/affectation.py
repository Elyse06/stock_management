from django.core.exceptions import ValidationError
from django.db import models

from apps.employee.models import Direction, Employer, Site

from .salle import Salle


class Affectation(models.Model):
    class BeneficiaireType(models.TextChoices):
        EMPLOYE = "EMPLOYE", "Employé"
        DIRECTION = "DIRECTION", "Direction"
        SALLE = "SALLE", "Salle"
        SITE = "SITE", "Site (agence)"

    affectation_id = models.BigAutoField(primary_key=True)
    beneficiaire_type = models.CharField(max_length=20, choices=BeneficiaireType.choices)

    employe = models.ForeignKey(
        Employer, on_delete=models.PROTECT, null=True, blank=True,
        related_name="affectations",
    )
    direction = models.ForeignKey(
        Direction, on_delete=models.PROTECT, null=True, blank=True,
        related_name="affectations",
    )
    salle = models.ForeignKey(
        Salle, on_delete=models.PROTECT, null=True, blank=True,
        related_name="affectations",
    )
    site = models.ForeignKey(
        Site, on_delete=models.PROTECT, null=True, blank=True,
        related_name="affectations",
    )

    class Meta:
        db_table = "t_affectation"
        verbose_name = "Affectation"
        verbose_name_plural = "Affectations"
        constraints = [  # noqa: RUF012
            models.CheckConstraint(
                condition=(
                    models.Q(
                        beneficiaire_type="EMPLOYE", employe__isnull=False,
                        direction__isnull=True, salle__isnull=True, site__isnull=True,
                    ) |
                    models.Q(
                        beneficiaire_type="DIRECTION", direction__isnull=False,
                        employe__isnull=True, salle__isnull=True, site__isnull=True,
                    ) |
                    models.Q(
                        beneficiaire_type="SALLE", salle__isnull=False,
                        employe__isnull=True, direction__isnull=True, site__isnull=True,
                    ) |
                    models.Q(
                        beneficiaire_type="SITE", site__isnull=False,
                        employe__isnull=True, direction__isnull=True, salle__isnull=True,
                    )
                ),
                name="affectation_type_coherent_avec_cible",
            ),
            models.UniqueConstraint(
                fields=["employe"],
                condition=models.Q(employe__isnull=False),
                name="affectation_unique_employe",
            ),
            models.UniqueConstraint(
                fields=["direction"],
                condition=models.Q(direction__isnull=False),
                name="affectation_unique_direction",
            ),
            models.UniqueConstraint(
                fields=["salle"],
                condition=models.Q(salle__isnull=False),
                name="affectation_unique_salle",
            ),
            models.UniqueConstraint(
                fields=["site"],
                condition=models.Q(site__isnull=False),
                name="affectation_unique_site",
            ),
        ]

    def clean(self):
        cibles = {
            self.BeneficiaireType.EMPLOYE: self.employe_id,
            self.BeneficiaireType.DIRECTION: self.direction_id,
            self.BeneficiaireType.SALLE: self.salle_id,
            self.BeneficiaireType.SITE: self.site_id,
        }
        nb_renseignees = sum(1 for v in cibles.values() if v is not None)
        if nb_renseignees != 1:
            raise ValidationError(
                "Une affectation doit avoir exactement une cible : "
                "un employé, une direction, une salle OU un site."
            )
        if not cibles.get(self.beneficiaire_type):
            raise ValidationError(
                "beneficiaire_type ne correspond pas à la cible réellement renseignée."
            )

    def __str__(self):
        return f"{self.get_beneficiaire_type_display()} : {self.nom}"

    @property
    def cible(self):
        return self.employe or self.direction or self.salle or self.site

    @property
    def nom(self):
        if self.employe_id:
            return self.employe.emp_nom
        if self.direction_id:
            return self.direction.dir_libelle
        if self.salle_id:
            return self.salle.nom
        if self.site_id:
            return self.site.site_nom
        return ""

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @classmethod
    def pour_employe(cls, employe):
        obj, _ = cls.objects.get_or_create(
            employe=employe, defaults={"beneficiaire_type": cls.BeneficiaireType.EMPLOYE}
        )
        return obj

    @classmethod
    def pour_direction(cls, direction):
        obj, _ = cls.objects.get_or_create(
            direction=direction, defaults={"beneficiaire_type": cls.BeneficiaireType.DIRECTION}
        )
        return obj

    @classmethod
    def pour_salle(cls, salle):
        obj, _ = cls.objects.get_or_create(
            salle=salle, defaults={"beneficiaire_type": cls.BeneficiaireType.SALLE}
        )
        return obj

    @classmethod
    def pour_site(cls, site):
        obj, _ = cls.objects.get_or_create(
            site=site, defaults={"beneficiaire_type": cls.BeneficiaireType.SITE}
        )
        return obj

    @classmethod
    def resoudre(cls, beneficiaire):
        if isinstance(beneficiaire, Employer):
            return cls.pour_employe(beneficiaire)
        if isinstance(beneficiaire, Direction):
            return cls.pour_direction(beneficiaire)
        if isinstance(beneficiaire, Salle):
            return cls.pour_salle(beneficiaire)
        if isinstance(beneficiaire, Site):
            return cls.pour_site(beneficiaire)
        raise ValidationError(
            "beneficiaire doit être un Employer, une Direction, une Salle ou un Site."
        )

    CHAMPS_BENEFICIAIRE = (
        "employe_beneficiaire",
        "direction_beneficiaire",
        "salle_beneficiaire",
        "site_beneficiaire",
    )

    @classmethod
    def extraire_et_resoudre(cls, data, requis=False):
        beneficiaire = None
        nb_renseignees = 0
        for champ in cls.CHAMPS_BENEFICIAIRE:
            valeur = data.pop(champ, None)
            if valeur is not None:
                beneficiaire = valeur
                nb_renseignees += 1

        if nb_renseignees > 1:
            raise ValueError(
                "Un seul bénéficiaire autorisé : employé, direction, salle ou site."
            )
        if beneficiaire is None:
            if requis:
                raise ValueError(
                    "Un bénéficiaire est requis : employé, direction, salle ou site."
                )
            return None
        return cls.resoudre(beneficiaire)