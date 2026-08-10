from django.contrib import admin

from .models import Commande, DetailCommande

# Register your models here.s
class DetailCommandeInline(admin.TabularInline):
    model = DetailCommande
    extra = 1


@admin.register(Commande)
class CommandeAdmin(admin.ModelAdmin):
    list_display = (
        "commande_id", 
        "statut", 
        "utilisateur_demandeur", 
        "utilisateur_traitant", 
        "date_comande", 
        "date_traitement",
    )
    list_filter = ("statut",)
    inlines = [DetailCommandeInline]
