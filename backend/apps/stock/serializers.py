from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.catalogue.models import Article
from apps.commande.models import AttributionDetailCommande
from apps.commande.utils import generate_attribution_qr_payload
from apps.employee.models import Direction
from apps.stock.models import (
    DetailMouvement,
    InventaireSession,
    LigneInventaire,
    Magasin,
    Mouvement,
    UniteArticle,
)
from apps.stock.utils import calculer_stock_theorique


class MagasinSerializer(serializers.ModelSerializer):
    localite_nom = serializers.CharField(
        source="localite.site_nom", read_only=True, default=None
    )
    localite_type = serializers.CharField(
        source="localite.site_type", read_only=True, default=None
    )

    class Meta:
        model = Magasin
        fields = ["magasin_id", "magasin_nom", "localite", "localite_nom", "localite_type"]


class UniteArticleSerializer(serializers.ModelSerializer):
    article_designation = serializers.CharField(
        source="article.designation", read_only=True
    )
    article_code = serializers.CharField(
        source="article.code_article", read_only=True
    )
    employe_attribue_nom = serializers.CharField(
        source="employe_attribue.emp_nom", read_only=True, default=None
    )
    employe_attribue_matricule = serializers.CharField(
        source="employe_attribue.emp_matricule", read_only=True, default=None
    )

    class Meta:
        model = UniteArticle
        fields = [
            "unite_id",
            "article",
            "article_code",
            "article_designation",
            "numero_de_serie",
            "statut",
            "date_creation",
            "mouvement_entree",
            "mouvement_sortie",
            "employe_attribue",
            "employe_attribue_nom",
            "employe_attribue_matricule",
        ]
        read_only_fields = ["unite_id", "date_creation", "mouvement_entree", "mouvement_sortie"]

    def validate_numero_de_serie(self, value):
        if value and value.strip():
            if UniteArticle.objects.filter(numero_de_serie=value.strip()).exists():
                raise serializers.ValidationError(
                    "Ce numéro de série existe déjà."
                )
            return value.strip()
        return value
    

class DetailMouvementSerializer(serializers.ModelSerializer):
    article_designation = serializers.CharField(
        source="article.designation", read_only=True
    )
    employe_beneficiaire_nom = serializers.CharField(
        source="employe_beneficiaire.emp_nom", read_only=True, default=None
    )
    employe_beneficiaire_matricule = serializers.CharField(
        source="employe_beneficiaire.emp_matricule", read_only=True, default=None
    )
    employe_beneficiaire_fonction = serializers.CharField(
        source="employe_beneficiaire.emp_fonction", read_only=True, default=None
    )
    fournisseur_nom = serializers.CharField(
        source="fournisseur.nom", read_only=True, default=None
    )

    qr_code_data = serializers.SerializerMethodField()

    unites_creees = UniteArticleSerializer(many=True, read_only=True)
    unites_attribuees = UniteArticleSerializer(many=True, read_only=True)

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
            "employe_beneficiaire_matricule",
            "employe_beneficiaire_fonction",
            "fournisseur",
            "fournisseur_nom",
            "code_tracabilite",
            "qr_code_data",
            "unites_creees",
            "unites_attribuees",
        ]
        read_only_fields = ["mouvement"]

    def get_qr_code_data(self, obj):
        if not obj.code_tracabilite:
            return None
        
        try:
            attribution = AttributionDetailCommande.objects.filter(
                code_unique=obj.code_tracabilite
            ).first()
            
            if attribution:
                return generate_attribution_qr_payload(attribution)
        except Exception:
            pass
        
        return None


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
            detail_mouvement = DetailMouvement.objects.create(
                mouvement=mouvement, **detail
            )

            article = detail_mouvement.article
            if article.mode_suivi == Article.ModeSuivi.NUMERO_SERIE:
                numeros_de_serie = detail.get("numeros_de_serie", [])
                
                if mouvement.type_mouvement == Mouvement.Type.ENTREE:
                    for numero in numeros_de_serie:
                        UniteArticle.objects.create(
                            article=article,
                            numero_de_serie=numero,
                            statut=UniteArticle.Statut.EN_STOCK,
                            mouvement_entree=detail_mouvement,
                        )
                elif mouvement.type_mouvement == Mouvement.Type.SORTIE:
                    employe = detail_mouvement.employe_beneficiaire
                    for numero in numeros_de_serie:
                        unite = UniteArticle.objects.get(
                            article=article,
                            numero_de_serie=numero,
                            statut=UniteArticle.Statut.EN_STOCK
                        )
                        unite.attribuer(
                            employe=employe,
                            mouvement_sortie=detail_mouvement
                        )

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

    service = serializers.PrimaryKeyRelatedField(
        queryset=Direction.objects.all(),
        source='direction',
        required=False,
        allow_null=True,
        write_only=True
    )

    service_libelle = serializers.CharField(
        source='direction.dir_libelle', 
        read_only=True,
        default=None
    )

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
            "service_libelle",
            "lieu_nom",
            "lignes",
        ]
        read_only_fields = ["code_reference", "statut", "date_creation", "date_validation"]

    def get_lieu_nom(self, obj):
        if obj.magasin:
            return f"Magasin: {obj.magasin.magasin_nom}"
        if obj.direction:
            return f"Direction: {obj.direction.dir_libelle}"
        return "N/A"

    def validate(self, attrs):
        magasin = attrs.get("magasin", getattr(self.instance, "magasin", None))
        direction = attrs.get("direction", getattr(self.instance, "direction", None))

        if not magasin and not direction:
            raise serializers.ValidationError(
                "Veuillez sélectionner soit un Magasin, soit une Direction."
            )
        if magasin and direction:
            raise serializers.ValidationError(
                "Vous ne pouvez pas sélectionner un Magasin ET une Direction à la fois."
            )
        return attrs

    
    @transaction.atomic
    def create(self, validated_data):
        lignes_data = validated_data.pop("lignes", [])
        magasin = validated_data.get("magasin")
        direction = validated_data.get("direction")

        #Générer automatiquement le code_reference
        validated_data["code_reference"] = generer_code_reference()

        session = InventaireSession.objects.create(**validated_data)

        for ligne_data in lignes_data:
            article = ligne_data.get("article")
            
            #Calculer le stock théorique automatiquement
            stock_theorique = calculer_stock_theorique(
                article=article,
                magasin=magasin,
                direction=direction,
            )
            
            ligne_data["quantite_theorique"] = stock_theorique
            
            LigneInventaire.objects.create(session=session, **ligne_data)
        
        return session