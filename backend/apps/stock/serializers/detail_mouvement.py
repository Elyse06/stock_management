from rest_framework import serializers

from apps.commande.models import AttributionDetailCommande
from apps.commande.utils import generate_attribution_qr_payload
from apps.employee.models import Direction, Employer, Site
from apps.stock.models import Affectation, DetailMouvement, Salle

from .unite_article import UniteArticleSerializer


class DetailMouvementSerializer(serializers.ModelSerializer):
    article_designation = serializers.CharField(source="article.designation", read_only=True)
    employe_beneficiaire_nom = serializers.CharField(read_only=True)
    employe_beneficiaire_matricule = serializers.CharField(read_only=True)
    employe_beneficiaire_fonction = serializers.CharField(read_only=True)
    direction_beneficiaire_nom = serializers.CharField(
        source="affectation.direction.dir_libelle", read_only=True, default=None
    )
    salle_beneficiaire_nom = serializers.CharField(
        source="affectation.salle.nom", read_only=True, default=None
    )
    site_beneficiaire_nom = serializers.CharField(
        source="affectation.site.site_nom", read_only=True, default=None
    )
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

    fournisseur_nom = serializers.CharField(source="fournisseur.nom", read_only=True, default=None)
    qr_code_data = serializers.SerializerMethodField()
    unites_creees = UniteArticleSerializer(many=True, read_only=True)
    unites_attribuees = UniteArticleSerializer(many=True, read_only=True)
    numeros_de_serie = serializers.ListField(child=serializers.CharField(), required=False, write_only=True)

    class Meta:
        model = DetailMouvement
        fields = '__all__'
        read_only_fields = (
            'id', 'mouvement', 'article_designation', 'fournisseur_nom', 'qr_code_data',
            'unites_creees', 'unites_attribuees', 'affectation',
            'employe_beneficiaire_nom', 'employe_beneficiaire_matricule',
            'employe_beneficiaire_fonction', 'direction_beneficiaire_nom',
            'salle_beneficiaire_nom', 'site_beneficiaire_nom', 'beneficiaire_type',
        )

    def validate(self, attrs):
        valeurs = [attrs.get(c) for c in Affectation.CHAMPS_BENEFICIAIRE if c in attrs]
        if sum(v is not None for v in valeurs) > 1:
            raise serializers.ValidationError(
                "Un seul bénéficiaire autorisé : employé, direction, salle ou site."
            )
        article = attrs.get("article") or (
            self.instance.article if self.instance else None
        )
        employe = attrs.get("employe_beneficiaire")
        if article and not article.is_immobilisation and employe:
            raise serializers.ValidationError(
                "Une fourniture ne peut pas être attribuée à un employé."
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
        return validated_data

    def create(self, validated_data):
        validated_data = self._appliquer_affectation(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._appliquer_affectation(validated_data)
        return super().update(instance, validated_data)

    def get_qr_code_data(self, obj):
        if not obj.code_tracabilite:
            return None
        
        try:
            attribution = AttributionDetailCommande.objects.filter(
                code_unique=obj.code_tracabilite
            ).first()
            
            if attribution:
                return generate_attribution_qr_payload(attribution)
        except Exception:  # noqa: BLE001, S110
            pass
        
        return None
