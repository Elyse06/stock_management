from rest_framework import serializers

from apps.catalogue.models import Article
from apps.common.serializers import BeneficiaireWriteMixin
from apps.stock.models import UniteArticle


class UniteArticleSerializer(BeneficiaireWriteMixin, serializers.ModelSerializer):
    article_designation = serializers.CharField(source="article.designation", read_only=True)
    article_code = serializers.CharField(source="article.code_article", read_only=True)
    employe_attribue_nom = serializers.CharField(read_only=True)
    employe_attribue_matricule = serializers.CharField(read_only=True)
    beneficiaire_type = serializers.CharField(read_only=True)

    message_plusieurs_beneficiaires = "Un seul bénéficiaire autorisé."

    class Meta:
        model = UniteArticle
        fields = [  # noqa: RUF012
            "unite_id", "article", "article_code", "article_designation",
            "numero_de_serie", "statut", "etat", "date_creation",
            "mouvement_entree", "mouvement_sortie", "affectation",
            "employe_beneficiaire", "direction_beneficiaire",
            "salle_beneficiaire", "site_beneficiaire",
            "employe_attribue_nom", "employe_attribue_matricule", "beneficiaire_type",
        ]
        read_only_fields = [  # noqa: RUF012
            "unite_id", "date_creation", "mouvement_entree", "mouvement_sortie",
            "article_code", "article_designation", "affectation",
            "employe_attribue_nom", "employe_attribue_matricule", "beneficiaire_type",
        ]

    def validate_numero_de_serie(self, value):
        if not value or not value.strip():
            return value
        value = value.strip()
        doublons = UniteArticle.objects.filter(numero_de_serie=value)
        if self.instance is not None:
            doublons = doublons.exclude(pk=self.instance.pk)
        if doublons.exists():
            raise serializers.ValidationError("Ce numéro de série existe déjà.")
        return value

    def validate(self, attrs):
        self.valider_beneficiaire_unique(attrs)
        article = attrs.get("article") or (self.instance.article if self.instance else None)
        if article:
            numero = attrs.get(
                "numero_de_serie", self.instance.numero_de_serie if self.instance else None
            )
            suivi_serie = article.mode_suivi == Article.ModeSuivi.NUMERO_SERIE
            if suivi_serie and not numero:
                raise serializers.ValidationError(
                    {"numero_de_serie": "Obligatoire pour les articles suivis par numéro de série."}
                )
            if not suivi_serie and numero:
                raise serializers.ValidationError(
                    {"numero_de_serie": "Non autorisé pour les articles non suivis par numéro de série."}
                )
        return attrs

    def _appliquer_affectation(self, validated_data):
        fourni = self.beneficiaire_fourni()
        affectation = self.extraire_affectation(validated_data)
        if fourni:
            validated_data["affectation"] = affectation
            validated_data["statut"] = (
                UniteArticle.Statut.ATTRIBUE if affectation else UniteArticle.Statut.EN_STOCK
            )
        return validated_data

    def create(self, validated_data):
        return super().create(self._appliquer_affectation(validated_data))

    def update(self, instance, validated_data):
        return super().update(instance, self._appliquer_affectation(validated_data))
