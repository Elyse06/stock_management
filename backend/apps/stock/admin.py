from django.contrib import admin

from .models import Magasin, Mouvement, DetailMouvement, Inventaire

# Register your models here.
class DetailMouvementInline(admin.TabularInline):
    model = DetailMouvement
    extra = 1


@admin.register(Magasin)
class MagasinAdmin(admin.ModelAdmin):
    list_display = ("magasin_id", "nom", "localite")
    search_fields = ("nom", "localite")


@admin.register(Mouvement)
class MouvementAdmin(admin.ModelAdmin):
    list_display = ("mouvement_id", "type_mouvement", "date", "magasin_source", "magasin_destination")
    list_filter = ("type_mouvement",)
    inlines = [DetailMouvementInline]


@admin.register(Inventaire)
class InventaireAdmin(admin.ModelAdmin):
    list_display = ("inventaire_id", "mouvement", "magasin", "quantite_theorique", "quantite_physique", "ecart", "date")
    list_filter = ("magasin",)
    readonly_fields = ("ecart",)
