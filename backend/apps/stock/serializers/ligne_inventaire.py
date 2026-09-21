from apps.catalogue.models import Article
from apps.stock.models import LigneInventaire, UniteArticle
from rest_framework import serializers


class LigneInventaireSerializer(serializers.ModelSerializer):
    article_designation = serializers.CharField(source="article.designation", read_only=True)
    article_mode_suivi = serializers.CharField(source='article.mode_suivi', read_only=True)
    article_is_immobilisation = serializers.BooleanField(source='article.is_immobilisation', read_only=True)

    class Meta:
        model = LigneInventaire
        fields = [  # noqa: RUF012
            "id", "article", "article_designation",
            "article_mode_suivi", "article_is_immobilisation",
            "quantite_theorique", "quantite_physique", "ecart",
            "commentaire", "propositions_series",
        ]
        read_only_fields = ["quantite_theorique", "ecart"]  # noqa: RUF012

    def validate(self, attrs):
        article = attrs.get('article', getattr(self.instance, 'article', None))
        propositions = attrs.get('propositions_series', 
                                  getattr(self.instance, 'propositions_series', {}) or {})
        
        if article is None:
            return attrs
        
        is_numero_serie = article.mode_suivi == Article.ModeSuivi.NUMERO_SERIE
        
        if not is_numero_serie and propositions:
            raise serializers.ValidationError({
                'propositions_series': (
                    "Les propositions de numéros de série ne sont autorisées "
                    "que pour les articles suivis par numéro de série."
                )
            })
        
        if is_numero_serie and propositions:
            unite_ids_retraits = {r['unite_id'] for r in propositions.get('retraits', [])}
            unite_ids_changes = {c['unite_id'] for c in propositions.get('changements_etat', [])}
            tous_ids = unite_ids_retraits | unite_ids_changes
            
            if tous_ids:
                unites_existantes = UniteArticle.objects.filter(
                    unite_id__in=tous_ids,
                    article=article
                )
                ids_trouves = set(unites_existantes.values_list('unite_id', flat=True))
                ids_manquants = tous_ids - ids_trouves
                if ids_manquants:
                    raise serializers.ValidationError({
                        'propositions_series': (
                            f"Unités inexistantes ou n'appartenant pas à l'article "
                            f"'{article.designation}' : {sorted(ids_manquants)}"
                        )
                    })
            
            numeros_ajouts = {a['numero_serie'] for a in propositions.get('ajouts', [])}
            if numeros_ajouts:
                numeros_existants = UniteArticle.objects.filter(
                    article=article,
                    numero_de_serie__in=numeros_ajouts
                ).values_list('numero_de_serie', flat=True)
                if numeros_existants:
                    raise serializers.ValidationError({
                        'propositions_series': (
                            f"Ces numéros de série existent déjà pour l'article "
                            f"'{article.designation}' : {list(numeros_existants)}"
                        )
                    })
        
        return attrs
