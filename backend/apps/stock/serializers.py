from django.db import transaction
from rest_framework import serializers

from apps.stock.models import (
    DetailMouvement,
    InventaireSession,
    LigneInventaire,
    Magasin,
    Mouvement,
)


class MagasinSerializer(serializers.ModelSerializer):
    class Meta:
        model = Magasin
        fields = ["magasin_id", "magasin_nom", "localite"]


class DetailMouvementSerializer(serializers.ModelSerializer):
    article_designation = serializers.CharField(
        source="article.designation", read_only=True
    )
    employe_beneficiaire_nom = serializers.CharField(
        source="employe_beneficiaire.emp_nom", read_only=True, default=None
    )

    class Meta:
        model = DetailMouvement
        fields = [
            "id",
            "mouvement",
            "article",
            "article_designation",
            "quantite",
            "employe_beneficiaire",
            "employe_beneficiaire_nom",
            "code_tracabilite",
        ]
        read_only_fields = ["mouvement"]


class MouvementSerializer(serializers.ModelSerializer):
    details = DetailMouvementSerializer(many=True, required=False)
    magasin_source_nom = serializers.CharField(
        source="magasin_source.magasin_nom", read_only=True, default=None
    )
    magasin_destination_nom = serializers.CharField(
        source="magasin_destination.magasin_nom", read_only=True, default=None
    )

    class Meta:
        model = Mouvement
        fields = [
            "mouvement_id",
            "date",
            "type_mouvement",
            "origine",
            "motif",
            "magasin_source",
            "magasin_source_nom",
            "magasin_destination",
            "magasin_destination_nom",
            "details",
        ]
        read_only_fields = ["date"]

    def validate(self, attrs):
        type_mouvement = attrs.get("type_mouvement")
        source = attrs.get("magasin_source")
        destination = attrs.get("magasin_destination")

        if type_mouvement == Mouvement.Type.ENTREE and not destination:
            raise serializers.ValidationError(
                {"magasin_destination": "Une entrée doit avoir un magasin de destination."}
            )
        if type_mouvement == Mouvement.Type.SORTIE and not source:
            raise serializers.ValidationError(
                {"magasin_source": "Une sortie doit avoir un magasin source."}
            )
        if type_mouvement == Mouvement.Type.TRANSFERT:
            if not source or not destination:
                raise serializers.ValidationError(
                    "Un transfert doit avoir un magasin source ET destination."
                )
            if source == destination:
                raise serializers.ValidationError(
                    "Source et destination doivent être différents pour un transfert."
                )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        details_data = validated_data.pop("details", [])
        mouvement = Mouvement.objects.create(**validated_data)
        for detail in details_data:
            DetailMouvement.objects.create(mouvement=mouvement, **detail)
        return mouvement


class LigneInventaireSerializer(serializers.ModelSerializer):
    article_designation = serializers.CharField(
        source="article.designation", read_only=True
    )

    class Meta:
        model = LigneInventaire
        fields = [
            "id",
            "article",
            "article_designation",
            "quantite_theorique",
            "quantite_physique",
            "ecart",
            "commentaire",
        ]
        read_only_fields = ["quantite_theorique", "ecart"]


class InventaireSessionSerializer(serializers.ModelSerializer):
    lignes = LigneInventaireSerializer(many=True, required=False)
    lieu_nom = serializers.SerializerMethodField()

    class Meta:
        model = InventaireSession
        fields = [
            "inventaire_id",
            "code_reference",
            "date_creation",
            "date_validation",
            "statut",
            "magasin",
            "service",
            "lieu_nom",
            "lignes",
        ]
        read_only_fields = ["statut", "date_creation", "date_validation"]

    def get_lieu_nom(self, obj):
        if obj.magasin:
            return f"Magasin: {obj.magasin.magasin_nom}"
        if obj.service:
            return f"Département: {obj.service.serv_libelle}"
        return "N/A"

    def validate(self, attrs):
        magasin = attrs.get("magasin", getattr(self.instance, "magasin", None))
        service = attrs.get("service", getattr(self.instance, "service", None))

        if not magasin and not service:
            raise serializers.ValidationError(
                "Veuillez sélectionner soit un Magasin, soit un Département."
            )
        if magasin and service:
            raise serializers.ValidationError(
                "Vous ne pouvez pas sélectionner un Magasin ET un Département à la fois."
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        lignes_data = validated_data.pop("lignes", [])
        session = InventaireSession.objects.create(**validated_data)
        for ligne_data in lignes_data:
            LigneInventaire.objects.create(session=session, **ligne_data)
        return session