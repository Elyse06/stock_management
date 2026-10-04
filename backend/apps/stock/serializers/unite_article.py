from rest_framework import serializers

from apps.employee.models import Direction, Employer, Site
from apps.stock.models import Affectation, Salle, UniteArticle


class UniteArticleSerializer(serializers.ModelSerializer):
    article_designation = serializers.CharField(source="article.designation", read_only=True)
    article_code = serializers.CharField(source="article.code_article", read_only=True)
    employe_attribue_nom = serializers.CharField(read_only=True)
    employe_attribue_matricule = serializers.CharField(read_only=True)
    beneficiaire_type = serializers.CharField(read_only=True)

    employe_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Employer.objects.all(), required=False, allow_null=True, write_only=True
    )
    direction_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Direction.objects.all(), required=False, allow_null=True, write_only=True
    )
    salle_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Salle.objects.all(), required=False, allow_null=True, write_only=True
    )
    site_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Site.objects.all(), required=False, allow_null=True, write_only=True
    )

    class Meta:
        model = UniteArticle
        fields = [  # noqa: RUF012
            'unite_id', 'article', 'article_code', 'article_designation',
            'numero_de_serie', 'statut', 'etat', 'date_creation',
            'mouvement_entree', 'mouvement_sortie', 'affectation',
            'employe_beneficiaire', 'direction_beneficiaire',
            'salle_beneficiaire', 'site_beneficiaire',
            'employe_attribue_nom', 'employe_attribue_matricule', 'beneficiaire_type',
        ]
        read_only_fields = [  # noqa: RUF012
            'unite_id', 'date_creation', 'mouvement_entree', 'mouvement_sortie', 'article_code',
            'article_designation', 'affectation',
            'employe_attribue_nom', 'employe_attribue_matricule', 'beneficiaire_type'
        ]

    def validate(self, attrs):
        valeurs = [attrs.get(c) for c in Affectation.CHAMPS_BENEFICIAIRE if c in attrs]
        if sum(v is not None for v in valeurs) > 1:
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

    def _appliquer_affectation(self, validated_data):
        beneficiaire_fourni = any(
            c in self.initial_data for c in Affectation.CHAMPS_BENEFICIAIRE
        )
        try:
            affectation = Affectation.extraire_et_resoudre(validated_data)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        if beneficiaire_fourni:
            validated_data['affectation'] = affectation
            validated_data['statut'] = (
                UniteArticle.Statut.ATTRIBUE if affectation else UniteArticle.Statut.EN_STOCK
            )
        return validated_data

    def create(self, validated_data):
        validated_data = self._appliquer_affectation(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._appliquer_affectation(validated_data)
        return super().update(instance, validated_data)

    def validate_numero_de_serie(self, value):
        if value and value.strip():
            if UniteArticle.objects.filter(numero_de_serie=value.strip()).exists():
                raise serializers.ValidationError(
                    "Ce numéro de série existe déjà."
                )
            return value.strip()
        return value