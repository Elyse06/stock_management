from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager

# Create your models here.
class Profil(models.Model):
    profil_id = models.BigAutoField(primary_key=True)
    nom = models.CharField(max_length=30)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = "Profil"
        verbose_name_plural = "Profils"

    def __str__(self):
        return self.nom


class Employe(models.Model):
    employee_id = models.BigAutoField(primary_key=True)
    nom = models.CharField(max_length=100)
    matricule = models.CharField(max_length=20, unique=True)
    departement = models.CharField(max_length=50, blank=True)
    fonction = models.CharField(max_length=100, blank=True)
    telephone = models.CharField(max_length=30, blank=True)
    adresse = models.CharField(max_length=50, blank=True)
    chef_hierarchique = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subordonnes",
    )

    class Meta:
        verbose_name = "Employé"
        verbose_name_plural = "Employés"

    def __str__(self):
        return self.nom


class UtilisateurManager(BaseUserManager):
    def create_user(self, nom_user, email, employe, profil, password=None, **extra_fields):
        if not nom_user:
            raise ValueError("Le nom d'utilisateur est obligatoire")
        user = self.model(
            nom_user=nom_user,
            email=self.normalize_email(email),
            employe=employe,
            profil=profil,
            **extra_fields,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, nom_user, email, employe, profil, password=None, **extra_fields):
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(nom_user, email, employe, profil, password, **extra_fields)


class Utilisateur(AbstractBaseUser, PermissionsMixin):
    nom_user = models.CharField(max_length=50, unique=True)
    email = models.EmailField()
    date_creation = models.DateTimeField(auto_now_add=True)

    profil = models.ForeignKey(
        Profil, on_delete=models.PROTECT, related_name="utilisateurs"
    )
    employe = models.OneToOneField(
        Employe, on_delete=models.CASCADE, related_name="utilisateur"
    )

    objects = UtilisateurManager()

    USERNAME_FIELD = "nom_user"
    REQUIRED_FIELDS = ["email"]

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"

    def __str__(self):
        return self.nom_user
