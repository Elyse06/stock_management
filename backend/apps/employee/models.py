from django.db import models

from apps.utilisateur.models import Utilisateur


class Direction(models.Model):
    dir_id = models.CharField(primary_key = True,max_length = 8)
    dir_libelle = models.CharField(max_length = 50)
    dir_description = models.CharField(max_length = 255)

    class Meta:
        db_table = 't_direction'

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
    emp_utilisateur_id = models.ForeignKey(
        Utilisateur,
        models.CASCADE,
        db_column="emp_utilisateur_id",
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "t_employee"

    def __str__(self):
        return self.emp_nom