from apps.employee.models import Direction, Employer
from apps.stock.models import UniteArticle
from rest_framework import serializers


class UniteArticleSerializer(serializers.ModelSerializer):
    article_designation = serializers.CharField(source="article.designation", read_only=True)
    article_code = serializers.CharField(source="article.code_article", read_only=True)
    employe_attribue_nom = serializers.CharField(read_only=True)
    employe_attribue_matricule = serializers.CharField(read_only=True)
    beneficiaire_type = serializers.CharField(read_only=True)
    employe_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Employer.objects.all(), required=False, allow_null=True
    )
    direction_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Direction.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = UniteArticle
        fields = [  # noqa: RUF012
            'unite_id', 'article', 'article_code', 'article_designation',
            'numero_de_serie', 'statut', 'etat', 'date_creation',
            'mouvement_entree', 'mouvement_sortie',
            'employe_beneficiaire', 'direction_beneficiaire',
            'employe_attribue_nom', 'employe_attribue_matricule', 'beneficiaire_type',
        ]
        read_only_fields = [  # noqa: RUF012
            'unite_id', 'date_creation', 'mouvement_entree', 'mouvement_sortie', 'article_code', 
            'article_designation', 'employe_attribue_nom', 'employe_attribue_matricule', 'beneficiaire_type'
        ]

    def validate(self, attrs):
        has_emp = attrs.get('employe_beneficiaire') is not None
        has_dir = attrs.get('direction_beneficiaire') is not None
        if has_emp and has_dir:
            raise serializers.ValidationError("Un seul bénéficiaire autorisé.")
        
        article = attrs.get('article') or (self.instance.article if self.instance else None)
        if article:
            num_serie = attrs.get('numero_de_serie', self.instance.numero_de_serie if self.instance else None)
            if article.mode_suivi == 'NUMERO_SERIE' and not num_serie:
                raise serializers.ValidationError(
                    {'numero_de_serie': "Obligatoire pour les articles suivis par numéro de série."}
                )
            if article.mode_suivi != 'NUMERO_SERIE' and num_serie:
                raise serializers.ValidationError(
                    {'numero_de_serie': "Non autorisé pour les articles non suivis par numéro de série."}
                )
        return attrs

    def validate_numero_de_serie(self, value):
        if value and value.strip():
            if UniteArticle.objects.filter(numero_de_serie=value.strip()).exists():
                raise serializers.ValidationError(
                    "Ce numéro de série existe déjà."
                )
            return value.strip()
        return value
 