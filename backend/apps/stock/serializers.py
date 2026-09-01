from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone
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


def generer_code_reference():
    today = timezone.now().strftime("%Y%m%d")
    prefix = f"INV-{today}-"
    
    count_today = InventaireSession.objects.filter(
        code_reference__startswith=prefix
    ).count()
    
    next_number = count_today + 1
    return f"{prefix}{next_number:03d}"


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
        read_only_fields = ["code_reference", "statut", "date_creation", "date_validation"]

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

    def _calculer_stock_theorique(self, article, magasin=None, service=None):
        from apps.stock.models import Mouvement
        
        if magasin:
            entrees = DetailMouvement.objects.filter(
                mouvement__type_mouvement__in=[
                    Mouvement.Type.ENTREE,
                    Mouvement.Type.TRANSFERT,
                ],
                mouvement__magasin_destination=magasin,
                article=article,
            ).aggregate(total=Sum("quantite"))["total"] or 0

            sorties = DetailMouvement.objects.filter(
                mouvement__type_mouvement__in=[
                    Mouvement.Type.SORTIE,
                    Mouvement.Type.TRANSFERT,
                ],
                mouvement__magasin_source=magasin,
                article=article,
            ).aggregate(total=Sum("quantite"))["total"] or 0

            return entrees - sorties

        if service:
            stock_service = DetailMouvement.objects.filter(
                mouvement__type_mouvement=Mouvement.Type.SORTIE,
                employe_beneficiaire__emp_serv_id=service,
                article=article,
            ).aggregate(total=Sum("quantite"))["total"] or 0

            return stock_service

        return 0

    @transaction.atomic
    def create(self, validated_data):
        lignes_data = validated_data.pop("lignes", [])
        magasin = validated_data.get("magasin")
        service = validated_data.get("service")

        #Générer automatiquement le code_reference
        validated_data["code_reference"] = generer_code_reference()

        session = InventaireSession.objects.create(**validated_data)

        for ligne_data in lignes_data:
            article = ligne_data.get("article")
            
            #Calculer le stock théorique automatiquement
            stock_theorique = self._calculer_stock_theorique(
                article=article,
                magasin=magasin,
                service=service,
            )
            
            ligne_data["quantite_theorique"] = stock_theorique
            
            LigneInventaire.objects.create(session=session, **ligne_data)
        
        return session