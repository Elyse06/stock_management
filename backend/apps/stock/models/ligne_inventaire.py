from apps.catalogue.models import Article
from django.core.exceptions import ValidationError
from django.db import models

from .inventaire_session import InventaireSession
from .unite_article import UniteArticle


class LigneInventaire(models.Model):
    session = models.ForeignKey(InventaireSession, on_delete=models.CASCADE, related_name="lignes")
    article = models.ForeignKey(Article, on_delete=models.PROTECT, related_name="lignes_inventaire")
    quantite_theorique = models.DecimalField(max_digits=12, decimal_places=2)
    quantite_physique = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ecart = models.DecimalField(max_digits=12, decimal_places=2, editable=False, default=0)
    commentaire = models.TextField(blank=True, null=True)
    propositions_series = models.JSONField(
        default=dict, blank=True,
        verbose_name="Propositions de numéros de série",
    )

    class Meta:
        db_table = 't_ligne_inventaire'
        verbose_name = "Ligne d'inventaire"
        verbose_name_plural = "Lignes d'inventaire"
        unique_together = ("session", "article")

    def clean(self):
        super().clean()
        if self.propositions_series:
            if not isinstance(self.propositions_series, dict):
                raise ValidationError({
                    'propositions_series': "Doit être un objet JSON."
                })
            
            allowed_keys = {'ajouts', 'retraits', 'changements_etat'}
            invalid_keys = set(self.propositions_series.keys()) - allowed_keys
            if invalid_keys:
                raise ValidationError({
                    'propositions_series': f"Clés invalides : {invalid_keys}. Clés autorisées : {allowed_keys}"
                })
            
            for ajout in self.propositions_series.get('ajouts', []):
                if not isinstance(ajout, dict):
                    raise ValidationError({'propositions_series': "Chaque ajout doit être un objet."})
                if 'numero_serie' not in ajout or 'etat' not in ajout:
                    raise ValidationError({
                        'propositions_series': "Chaque ajout doit contenir 'numero_serie' et 'etat'."
                    })
                if ajout['etat'] not in UniteArticle.Etat.values:
                    raise ValidationError({
                        'propositions_series': f"État invalide : {ajout['etat']}"
                    })
            
            for retrait in self.propositions_series.get('retraits', []):
                if not isinstance(retrait, dict):
                    raise ValidationError({'propositions_series': "Chaque retrait doit être un objet."})
                if 'unite_id' not in retrait or 'numero_serie' not in retrait or 'etat' not in retrait:
                    raise ValidationError({
                        'propositions_series': "Chaque retrait doit contenir 'unite_id', 'numero_serie' et 'etat'."
                    })
                if retrait['etat'] not in [UniteArticle.Etat.HORS_USAGE, UniteArticle.Etat.PERDU]:
                    raise ValidationError({
                        'propositions_series': (
                            f"Un retrait doit avoir l'état 'HORS_USAGE' ou 'PERDU' (reçu : {retrait['etat']})."
                        )
                    })
            
            for changement in self.propositions_series.get('changements_etat', []):
                if not isinstance(changement, dict):
                    raise ValidationError({'propositions_series': "Chaque changement doit être un objet."})
                if 'unite_id' not in changement or 'numero_serie' not in changement or 'etat' not in changement:
                    raise ValidationError({
                        'propositions_series': "Chaque changement doit contenir 'unite_id', 'numero_serie' et 'etat'."
                    })
                if changement['etat'] in [UniteArticle.Etat.PERDU]:
                    raise ValidationError({
                        'propositions_series': (
                            "Un changement d'état ne peut pas être 'PERDU'. "
                            "Utilisez 'retraits' pour les unités perdues."
                        )
                    })

    def save(self, *args, **kwargs):
        self.ecart = self.quantite_physique - self.quantite_theorique
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.article.designation} (Théorique: {self.quantite_theorique}, Physique: {self.quantite_physique})"
