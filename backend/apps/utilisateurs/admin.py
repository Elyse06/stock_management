from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Profil, Employe, Utilisateur

# Register your models here.
@admin.register(Profil)
class ProfilAdmin(admin.ModelAdmin):
    list_display = ("profil_id", "nom")
    search_fields = ("nom",)


@admin.register(Employe)
class EmployeAdmin(admin.ModelAdmin):
    list_display = ("employee_id", "nom", "fonction", "chef_hierarchique")
    search_fields = ("nom", "fonction")


@admin.register(Utilisateur)
class UtilisateurAdmin(UserAdmin):
    model = Utilisateur
    list_display = ("nom_user", "email", "profil")
    list_filter = ("profil",)
    ordering = ("nom_user",)
    fieldsets = (
        (None, {"fields": ("nom_user", "password")}),
        ("Informations", {"fields": ("email", "employe", "profil")}),
        ("Statut", {"fields": ("is_superuser", "groups", "user_permissions")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("nom_user", "email", "employe", "profil", "password1", "password2"),
        }),
    )
