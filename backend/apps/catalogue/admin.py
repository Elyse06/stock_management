from django.contrib import admin

from .models import Categorie, Article, Fournisseur, ArticleFournisseur

# Register your models here.
class ArticleFournisseurInline(admin.TabularInline):
    model = ArticleFournisseur
    extra = 1


@admin.register(Categorie)
class CategorieAdmin(admin.ModelAdmin):
    list_display = ("categorie_id", "nom")
    search_fields = ("nom",)


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ("code_article", "designation", "categorie", "mode_suivi", "code_barre")
    list_filter = ("categorie", "mode_suivi")
    search_fields = ("code_article", "designation", "code_barre")
    inlines = [ArticleFournisseurInline]


@admin.register(Fournisseur)
class FournisseurAdmin(admin.ModelAdmin):
    list_display = ("fournisseur_id", "nom", "contact")
    search_fields = ("nom",)
    inlines = [ArticleFournisseurInline]
