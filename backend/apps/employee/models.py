import re

from django.db import models

from apps.utilisateur.models import Utilisateur


def _next_numeric_id(model, field_name):
    numeric_ids = (
        int(value)
        for value in model.objects.values_list(field_name, flat=True)
        if str(value).isdigit()
    )
    next_id = max(numeric_ids, default=0) + 1
    return str(next_id)


class Site(models.Model):
    SITE_TYPE_CHOICES = [  # noqa: RUF012
        ('SIEGE', 'Siège'),
        ('AGENCE', 'Agence'),
    ]
    
    site_id = models.AutoField(primary_key=True)
    site_nom = models.CharField(max_length=50)
    site_type = models.CharField(max_length=20, choices=SITE_TYPE_CHOICES)
    localite = models.CharField(max_length=50)
    
    class Meta:
        db_table = 't_site'
        verbose_name = 'Site'
        verbose_name_plural = 'Sites'
        unique_together = ['site_type', 'site_nom']  # noqa: RUF012

    def __str__(self):
        return f"{self.get_site_type_display()} - {self.site_nom}"

class Direction(models.Model):
    dir_id = models.CharField(primary_key = True,max_length = 8)
    dir_libelle = models.CharField(max_length = 50)
    dir_description = models.CharField(max_length = 255)

    class Meta:
        db_table = 't_direction'

    def save(self, *args, **kwargs):
        if not self.dir_id:
            self.dir_id = _next_numeric_id(Direction, 'dir_id')
        super().save(*args, **kwargs)

    def __str__(self) :
        return self.dir_libelle
    

class Service(models.Model):
    serv_id = models.CharField(primary_key=True, max_length=8)
    serv_libelle = models.CharField(max_length=50)
    serv_info = models.TextField()
    serv_dir_id = models.ForeignKey(
        Direction, models.CASCADE, db_column='serv_dir_id'
    )

    class Meta:
        db_table = 't_service'

    def save(self, *args, **kwargs):
        if not self.serv_id:
            self.serv_id = _next_numeric_id(Service, 'serv_id')
        super().save(*args, **kwargs)

    def __str__(self):
        return self.serv_libelle
    

class Employer(models.Model):
    emp_id = models.CharField(primary_key=True, max_length=6)
    emp_nom = models.CharField(max_length=255)
    emp_matricule = models.CharField(max_length=15)
    emp_contact = models.CharField(max_length=50)
    emp_fonction = models.CharField(max_length=50)
    emp_serv_id = models.ForeignKey(
        Service, models.SET_NULL, db_column="emp_serv_id",null = True
    )
    emp_dir_id = models.ForeignKey(
        Direction,
        models.SET_NULL, db_column="emp_dir_id", related_name="employees", null=True, blank=True,
    )
    emp_site_id = models.ForeignKey(
        Site,
        models.SET_NULL, db_column="emp_site_id", related_name="employees", null=True, blank=True,
    )
    emp_utilisateur_id = models.ForeignKey(
        Utilisateur, models.CASCADE, db_column="emp_utilisateur_id", null=True, blank=True,
    )
    emp_chef_hierarchique = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True,
    )

    class Meta:
        db_table = "t_employee"

    @staticmethod
    def generer_emp_id_unique(matricule_str):
        base = re.sub(r"[^A-Za-z0-9]", "", matricule_str)[-5:].upper() or "EMP"
        candidat = f"E{base}"[:6]
        suffixe = 0
        while Employer.objects.filter(emp_id=candidat).exists():
            suffixe += 1
            candidat = f"E{base[:5 - len(str(suffixe))]}{suffixe}"[:6]
        return candidat

    def save(self, *args, **kwargs):
        if not self.emp_id:
            self.emp_id = self.generer_emp_id_unique(self.emp_matricule)
        if self.emp_serv_id_id:
            self.emp_dir_id = self.emp_serv_id.serv_dir_id
        update_fields = kwargs.get("update_fields")
        if update_fields is not None:
            kwargs["update_fields"] = set(update_fields) | {"emp_dir_id"}
        super().save(*args, **kwargs)

    def __str__(self):
        return self.emp_nom

    @property
    def direction(self):
        return self.emp_dir_id or (
            self.emp_serv_id.serv_dir_id if self.emp_serv_id else None
        )

    @property
    def site(self):
        return self.emp_site_id