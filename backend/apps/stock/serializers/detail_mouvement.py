from rest_framework import serializers

from apps.commande.models import AttributionDetailCommande
from apps.commande.utils import generate_attribution_qr_payload
from apps.employee.models import Direction, Employer, Site
from apps.stock.models import DetailMouvement

from .unite_article import UniteArticleSerializer


class DetailMouvementSerializer(serializers.ModelSerializer):
    article_designation = serializers.CharField(source="article.designation", read_only=True)
    employe_beneficiaire_nom = serializers.CharField(read_only=True)
    employe_beneficiaire_matricule = serializers.CharField(read_only=True)
    employe_beneficiaire_fonction = serializers.CharField(read_only=True)
    direction_beneficiaire_nom = serializers.CharField(
        source="direction_beneficiaire.dir_libelle", read_only=True, default=None
    )
    site_beneficiaire_nom = serializers.CharField(
        source="site_beneficiaire.site_nom", read_only=True, default=None
    )
    beneficiaire_type = serializers.CharField(read_only=True)
    employe_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Employer.objects.all(), required=False, allow_null=True
    )
    direction_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Direction.objects.all(), required=False, allow_null=True
    )
    site_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Site.objects.all(), required=False, allow_null=True
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
            'unites_creees', 'unites_attribuees',
            'employe_beneficiaire', 'direction_beneficiaire', 'site_beneficiaire',
            'employe_beneficiaire_nom', 'employe_beneficiaire_matricule',
            'employe_beneficiaire_fonction', 'direction_beneficiaire_nom',
            'site_beneficiaire_nom', 'beneficiaire_type',
        )

    def validate(self, attrs):
        has_emp = attrs.get('employe_beneficiaire') is not None
        has_dir = attrs.get('direction_beneficiaire') is not None
        has_site = attrs.get('site_beneficiaire') is not None
        if sum((has_emp, has_dir, has_site)) > 1:
            raise serializers.ValidationError(
                "Un seul bénéficiaire autorisé : soit 'employe_beneficiaire', soit 'direction_beneficiaire', soit 'site_beneficiaire'."
            )
        return attrs

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
