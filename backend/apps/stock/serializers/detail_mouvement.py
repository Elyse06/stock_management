from rest_framework import serializers

from apps.commande.utils import qr_payloads_par_code
from apps.common.serializers import BeneficiaireWriteMixin
from apps.stock.models import DetailMouvement

from .unite_article import UniteArticleSerializer


class DetailMouvementListSerializer(serializers.ListSerializer):
    def to_representation(self, data):
        details = list(data.all() if hasattr(data, "all") else data)
        self.child.qr_cache = qr_payloads_par_code(
            d.code_tracabilite for d in details if d.code_tracabilite
        )
        return super().to_representation(details)


class DetailMouvementSerializer(BeneficiaireWriteMixin, serializers.ModelSerializer):
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
    fournisseur_nom = serializers.CharField(source="fournisseur.nom", read_only=True, default=None)
    qr_code_data = serializers.SerializerMethodField()
    unites_creees = UniteArticleSerializer(many=True, read_only=True)
    unites_attribuees = UniteArticleSerializer(many=True, read_only=True)
    numeros_de_serie = serializers.ListField(
        child=serializers.CharField(max_length=100), required=False, write_only=True
    )

    class Meta:
        model = DetailMouvement
        fields = "__all__"
        list_serializer_class = DetailMouvementListSerializer
        read_only_fields = (
            "id", "mouvement", "affectation", "code_tracabilite",
        )

    def validate(self, attrs):
        self.valider_beneficiaire_unique(attrs)
        article = attrs.get("article") or (self.instance.article if self.instance else None)
        if article and not article.is_immobilisation and attrs.get("employe_beneficiaire"):
            raise serializers.ValidationError("Une fourniture ne peut pas être attribuée à un employé.")
        return attrs

    def _appliquer_affectation(self, validated_data):
        fourni = self.beneficiaire_fourni()
        affectation = self.extraire_affectation(validated_data)
        if fourni:
            validated_data["affectation"] = affectation
        validated_data.pop("numeros_de_serie", None)
        return validated_data

    def create(self, validated_data):
        return super().create(self._appliquer_affectation(validated_data))

    def update(self, instance, validated_data):
        return super().update(instance, self._appliquer_affectation(validated_data))

    def get_qr_code_data(self, obj):
        if not obj.code_tracabilite:
            return None
        cache = getattr(self, "qr_cache", None)
        if cache is None:
            cache = qr_payloads_par_code([obj.code_tracabilite])
        return cache.get(str(obj.code_tracabilite))
