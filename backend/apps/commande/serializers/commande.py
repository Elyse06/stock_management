from django.db import transaction
from rest_framework import serializers

from apps.commande.models import AttributionDetailCommande, Commande, DetailCommande
from apps.commande.utils import format_employee_data, generate_attribution_qr_payload
from apps.employee.models import Direction, Employer


class AttributionDetailCommandeSerializer(serializers.ModelSerializer):
    beneficiaire_nom = serializers.CharField(read_only=True)
    beneficiaire_type = serializers.CharField(read_only=True)
    employe_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Employer.objects.all(), required=False, allow_null=True
    )
    direction_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Direction.objects.all(), required=False, allow_null=True
    )
    qr_code_data = serializers.SerializerMethodField()
    date_acquisition = serializers.DateTimeField(read_only=True)

    class Meta:
        model = AttributionDetailCommande
        fields = [
            "id", "detail_commande",
            "employe_beneficiaire", "direction_beneficiaire",
            "beneficiaire_nom", "beneficiaire_type",
            "quantite", "quantite_demandee", "quantite_validee",
            "statut", "motif_refus",
            "code_unique", "date_acquisition", "qr_code_data",
        ]
        read_only_fields = ["id", "detail_commande", "code_unique", "qr_code_data", "date_acquisition"]

    def validate(self, attrs):
        employe = attrs.get(
            "employe_beneficiaire",
            getattr(self.instance, "employe_beneficiaire", None)
        )
        direction = attrs.get(
            "direction_beneficiaire",
            getattr(self.instance, "direction_beneficiaire", None)
        )
        if bool(employe) == bool(direction):
            raise serializers.ValidationError(
                "Choisir soit un employé, soit une direction bénéficiaire (l'un des deux)."
            )

        detail_commande = attrs.get(
            "detail_commande",
            getattr(self.instance, "detail_commande", None)
        )
        if detail_commande and not detail_commande.article.is_immobilisation and employe:
            raise serializers.ValidationError(
                "Une fourniture (non-immobilisation) ne peut être attribuée qu'à une direction."
            )
        return attrs

    def get_qr_code_data(self, obj):
        return generate_attribution_qr_payload(obj)


class DetailCommandeSerializer(serializers.ModelSerializer):
    article_designation = serializers.CharField(
        source="article.designation", read_only=True
    )
    attributions = AttributionDetailCommandeSerializer(many=True, required=False)

    class Meta:
        model = DetailCommande
        fields = [
            "id",
            "commande",
            "article",
            "article_designation",
            "quantite",
            "attributions",
        ]
        read_only_fields = ["commande"]

    def validate(self, attrs):
        quantite_totale = attrs.get("quantite", getattr(self.instance, "quantite", 0))
        attributions = attrs.get("attributions", [])
        if attributions:
            somme_attributions = sum(attr.get("quantite", 0) for attr in attributions)
            if somme_attributions > quantite_totale:
                raise serializers.ValidationError({
                    "attributions": (
                        f"La somme des attributions ({somme_attributions}) ne peut pas "
                        f"dépasser la quantité totale de l'article ({quantite_totale})."
                    )
                })
        return attrs


class CommandeSerializer(serializers.ModelSerializer):
    details = DetailCommandeSerializer(many=True, required=False)
    demandeur = serializers.SerializerMethodField()
    traitant = serializers.SerializerMethodField()

    class Meta:
        model = Commande
        fields = [
            "commande_id",
            "objet",
            "statut",
            "date_commande",
            "date_traitement",
            "commentaire_agent",
            "employe_demandeur",
            "demandeur",
            "employe_traitant",
            "traitant",
            "details",
        ]
        read_only_fields = ["date_commande", "date_traitement", "employe_traitant"]

    def get_demandeur(self, obj):
        return format_employee_data(obj.employe_demandeur)

    def get_traitant(self, obj):
        return format_employee_data(obj.employe_traitant)

    @transaction.atomic
    def create(self, validated_data):
        details_data = validated_data.pop("details", [])
        request = self.context.get("request")
        demandeur = validated_data.pop("employe_demandeur", None)

        if demandeur is None and request and request.user:
            demandeur = Employer.objects.filter(
                emp_utilisateur_id_id=getattr(request.user, "pk", None)
            ).first()

        if demandeur is None:
            raise serializers.ValidationError({
                "employe_demandeur": "L'identifiant de l'employé demandeur est requis."
            })

        commande = Commande.objects.create(
            employe_demandeur=demandeur, **validated_data
        )

        for detail_data in details_data:
            attributions_data = detail_data.pop("attributions", [])
            detail = DetailCommande.objects.create(commande=commande, **detail_data)
            for attribution_data in attributions_data:
                AttributionDetailCommande.objects.create(
                    detail_commande=detail, **attribution_data
                )

        return commande


class RecapitulatifAttributionSerializer(serializers.ModelSerializer):
    beneficiaire_nom = serializers.CharField(read_only=True)
    beneficiaire_type = serializers.CharField(read_only=True)
    article_designation = serializers.CharField(
        source='detail_commande.article.designation',
        read_only=True
    )
    article_code = serializers.CharField(
        source='detail_commande.article.code_article',
        read_only=True
    )
    is_immobilisation = serializers.BooleanField(
        source='detail_commande.article.is_immobilisation',
        read_only=True
    )
    mode_suivi = serializers.CharField(
        source='detail_commande.article.mode_suivi',
        read_only=True
    )

    class Meta:
        model = AttributionDetailCommande
        fields = [
            'id',
            'detail_commande',
            'article_code',
            'article_designation',
            'is_immobilisation',
            'mode_suivi',
            'beneficiaire_nom',
            'beneficiaire_type',
            'quantite',
            'quantite_demandee',
            'quantite_validee',
            'statut',
            'motif_refus',
        ]
        read_only_fields = fields


class RecapitulatifDetailCommandeSerializer(serializers.ModelSerializer):
    article_designation = serializers.CharField(
        source='article.designation', read_only=True
    )
    article_code = serializers.CharField(
        source='article.code_article', read_only=True
    )
    is_immobilisation = serializers.BooleanField(
        source='article.is_immobilisation', read_only=True
    )
    mode_suivi = serializers.CharField(
        source='article.mode_suivi', read_only=True
    )
    attributions = RecapitulatifAttributionSerializer(many=True, read_only=True)

    # 🆕 Statistiques par ligne
    total_demande_ligne = serializers.SerializerMethodField()
    total_valide_ligne = serializers.SerializerMethodField()

    class Meta:
        model = DetailCommande
        fields = [
            'id',
            'article',
            'article_code',
            'article_designation',
            'is_immobilisation',
            'mode_suivi',
            'quantite',
            'attributions',
            'total_demande_ligne',
            'total_valide_ligne',
        ]
        read_only_fields = fields

    def get_total_demande_ligne(self, obj):
        from django.db.models import Sum
        result = obj.attributions.aggregate(
            total=Sum('quantite_demandee')
        )
        return result['total'] or 0

    def get_total_valide_ligne(self, obj):
        from django.db.models import Sum
        result = obj.attributions.filter(statut='VALIDEE').aggregate(
            total=Sum('quantite_validee')
        )
        return result['total'] or 0


class RecapitulatifCommandeSerializer(serializers.ModelSerializer):
    demandeur = serializers.SerializerMethodField()
    details = RecapitulatifDetailCommandeSerializer(many=True, read_only=True)
    total_lignes = serializers.SerializerMethodField()
    total_demande = serializers.SerializerMethodField()
    total_valide = serializers.SerializerMethodField()
    total_refuse = serializers.SerializerMethodField()
    total_en_attente = serializers.SerializerMethodField()

    class Meta:
        model = Commande
        fields = [
            'commande_id',
            'objet',
            'statut',
            'date_commande',
            'demandeur',
            'commentaire_agent',
            'details',
            'total_lignes',
            'total_demande',
            'total_valide',
            'total_refuse',
            'total_en_attente',
        ]
        read_only_fields = fields

    def get_demandeur(self, obj):
        return format_employee_data(obj.employe_demandeur)

    def get_total_lignes(self, obj):
        return obj.details.count()

    def get_total_demande(self, obj):
        from django.db.models import Sum
        result = AttributionDetailCommande.objects.filter(
            detail_commande__commande=obj
        ).aggregate(total=Sum('quantite_demandee'))
        return result['total'] or 0

    def get_total_valide(self, obj):
        from django.db.models import Sum
        result = AttributionDetailCommande.objects.filter(
            detail_commande__commande=obj,
            statut='VALIDEE'
        ).aggregate(total=Sum('quantite_validee'))
        return result['total'] or 0

    def get_total_refuse(self, obj):
        return AttributionDetailCommande.objects.filter(
            detail_commande__commande=obj,
            statut='REFUSEE'
        ).count()

    def get_total_en_attente(self, obj):
        return AttributionDetailCommande.objects.filter(
            detail_commande__commande=obj,
            statut='EN_ATTENTE'
        ).count()
    