from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.catalogue.models import Article
from apps.commande.models import AttributionDetailCommande
from apps.commande.utils import generate_attribution_qr_payload
from apps.employee.models import Direction, Employer
from apps.stock.models import (
    DetailMouvement,
    InventaireSession,
    LigneInventaire,
    Magasin,
    Mouvement,
    UniteArticle,
)
from apps.stock.services import retourner_unite_au_stock, transferer_unite
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
        fields = [
            'unite_id', 'article', 'article_code', 'article_designation',
            'numero_de_serie', 'statut', 'etat', 'date_creation',
            'mouvement_entree', 'mouvement_sortie',
            'employe_beneficiaire', 'direction_beneficiaire',
            'employe_attribue_nom', 'employe_attribue_matricule', 'beneficiaire_type',
        ]
        read_only_fields = ['unite_id', 'date_creation', 'mouvement_entree', 'mouvement_sortie',
                            'article_code', 'article_designation',
                            'employe_attribue_nom', 'employe_attribue_matricule', 'beneficiaire_type']

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
    

class DetailMouvementSerializer(serializers.ModelSerializer):
    article_designation = serializers.CharField(
        source="article.designation", read_only=True
    )
    employe_beneficiaire_nom = serializers.CharField(read_only=True)
    employe_beneficiaire_matricule = serializers.CharField(read_only=True)
    employe_beneficiaire_fonction = serializers.CharField(read_only=True)
    beneficiaire_type = serializers.CharField(read_only=True)
    
    employe_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Employer.objects.all(), required=False, allow_null=True
    )
    direction_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Direction.objects.all(), required=False, allow_null=True
    )

    fournisseur_nom = serializers.CharField(
        source="fournisseur.nom", read_only=True, default=None
    )

    qr_code_data = serializers.SerializerMethodField()

    unites_creees = UniteArticleSerializer(many=True, read_only=True)
    unites_attribuees = UniteArticleSerializer(many=True, read_only=True)

    numeros_de_serie = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = DetailMouvement
        fields = '__all__'
        read_only_fields = (
            'id', 'mouvement', 'article_designation', 'fournisseur_nom', 'qr_code_data',
            'unites_creees', 'unites_attribuees',
            'employe_beneficiaire_nom', 'employe_beneficiaire_matricule',
            'employe_beneficiaire_fonction', 'beneficiaire_type',
        )

    def validate(self, attrs):
        has_emp = attrs.get('employe_beneficiaire') is not None
        has_dir = attrs.get('direction_beneficiaire') is not None
        if has_emp and has_dir:
            raise serializers.ValidationError(
                "Un seul bénéficiaire autorisé : soit 'employe_beneficiaire', soit 'direction_beneficiaire'."
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
            numeros_de_serie = detail.pop("numeros_de_serie", [])
            detail_mouvement = DetailMouvement.objects.create(
                mouvement=mouvement, **detail
            )
            
            article = detail_mouvement.article
            if hasattr(article, 'mode_suivi') and article.mode_suivi == "NUMERO_SERIE":
                
                if mouvement.type_mouvement == Mouvement.Type.ENTREE:
                    for numero in numeros_de_serie:
                        UniteArticle.objects.create(
                            article=article,
                            numero_de_serie=numero.strip(),
                            statut=UniteArticle.Statut.EN_STOCK,
                            mouvement_entree=detail_mouvement,
                        )
                        
                elif mouvement.type_mouvement == Mouvement.Type.SORTIE:
                    employe = detail_mouvement.employe_beneficiaire
                    for numero in numeros_de_serie:
                        try:
                            unite = UniteArticle.objects.get(
                                article=article,
                                numero_de_serie=numero.strip(),
                                statut=UniteArticle.Statut.EN_STOCK
                            )
                            unite.attribuer(
                                beneficiaire=employe,
                                mouvement_sortie=detail_mouvement
                            )
                        except UniteArticle.DoesNotExist:
                            raise serializers.ValidationError(
                                f"L'unité avec le N° série '{numero}' n'existe pas ou n'est plus en stock."
                            )
                        
            elif (
                hasattr(article, 'is_immobilisation') and article.is_immobilisation
                and article.mode_suivi != Article.ModeSuivi.NUMERO_SERIE
                and mouvement.type_mouvement == Mouvement.Type.ENTREE
            ):
                quantite_a_creer = int(detail_mouvement.quantite)
                unites_a_creer = [
                    UniteArticle(
                        article=article,
                        statut=UniteArticle.Statut.EN_STOCK,
                        etat=UniteArticle.Etat.BON,
                        mouvement_entree=detail_mouvement,
                    )
                    for _ in range(quantite_a_creer)
                ]
                UniteArticle.objects.bulk_create(unites_a_creer)
        
        return mouvement


class LigneInventaireSerializer(serializers.ModelSerializer):
    article_designation = serializers.CharField(
        source="article.designation", read_only=True
    )
    article_mode_suivi = serializers.CharField(
        source='article.mode_suivi', read_only=True
    )
    article_is_immobilisation = serializers.BooleanField(
        source='article.is_immobilisation', read_only=True
    )

    class Meta:
        model = LigneInventaire
        fields = [
            "id", "article", "article_designation",
            "article_mode_suivi", "article_is_immobilisation",
            "quantite_theorique", "quantite_physique", "ecart",
            "commentaire", "propositions_series",
        ]
        read_only_fields = ["quantite_theorique", "ecart"]

    def validate(self, attrs):
        article = attrs.get('article', getattr(self.instance, 'article', None))
        propositions = attrs.get('propositions_series', 
                                  getattr(self.instance, 'propositions_series', {}) or {})
        
        if article is None:
            return attrs
        
        is_numero_serie = article.mode_suivi == Article.ModeSuivi.NUMERO_SERIE
        
        if not is_numero_serie and propositions:
            raise serializers.ValidationError({
                'propositions_series': (
                    "Les propositions de numéros de série ne sont autorisées "
                    "que pour les articles suivis par numéro de série."
                )
            })
        
        if is_numero_serie and propositions:
            unite_ids_retraits = {r['unite_id'] for r in propositions.get('retraits', [])}
            unite_ids_changes = {c['unite_id'] for c in propositions.get('changements_etat', [])}
            tous_ids = unite_ids_retraits | unite_ids_changes
            
            if tous_ids:
                unites_existantes = UniteArticle.objects.filter(
                    unite_id__in=tous_ids,
                    article=article
                )
                ids_trouves = set(unites_existantes.values_list('unite_id', flat=True))
                ids_manquants = tous_ids - ids_trouves
                if ids_manquants:
                    raise serializers.ValidationError({
                        'propositions_series': (
                            f"Unités inexistantes ou n'appartenant pas à l'article "
                            f"'{article.designation}' : {sorted(ids_manquants)}"
                        )
                    })
            
            numeros_ajouts = {a['numero_serie'] for a in propositions.get('ajouts', [])}
            if numeros_ajouts:
                numeros_existants = UniteArticle.objects.filter(
                    article=article,
                    numero_de_serie__in=numeros_ajouts
                ).values_list('numero_de_serie', flat=True)
                if numeros_existants:
                    raise serializers.ValidationError({
                        'propositions_series': (
                            f"Ces numéros de série existent déjà pour l'article "
                            f"'{article.designation}' : {list(numeros_existants)}"
                        )
                    })
        
        return attrs


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


class RetourUniteSerializer(serializers.Serializer):
    unite_id = serializers.IntegerField()
    magasin_destination = serializers.PrimaryKeyRelatedField(
        queryset=Magasin.objects.all()
    )
    motif = serializers.CharField(required=False, allow_blank=True, default="")
    
    def validate_unite_id(self, value):
        try:
            unite = UniteArticle.objects.get(unite_id=value)
        except UniteArticle.DoesNotExist:
            raise serializers.ValidationError(f"Unité #{value} introuvable.")
        
        if unite.statut != UniteArticle.Statut.ATTRIBUE:
            raise serializers.ValidationError(
                f"L'unité #{value} n'est pas attribuée."
            )
        
        if unite.etat == UniteArticle.Etat.PERDU:
            raise serializers.ValidationError(
                "Une unité marquée 'Perdu' ne peut pas être retournée."
            )
        
        return value
    
    def save(self, **kwargs):
        return retourner_unite_au_stock(
            unite_id=self.validated_data['unite_id'],
            magasin_destination=self.validated_data['magasin_destination'],
            motif=self.validated_data.get('motif', ''),
        )


class TransfertUniteSerializer(serializers.Serializer):
    unite_id = serializers.IntegerField()
    
    nouvel_employe_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Employer.objects.all(),
        required=False,
        allow_null=True,
    )
    nouvelle_direction_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Direction.objects.all(),
        required=False,
        allow_null=True,
    )
    
    magasin_source = serializers.PrimaryKeyRelatedField(
        queryset=Magasin.objects.all()
    )
    motif = serializers.CharField(required=False, allow_blank=True, default="")
    
    def validate(self, attrs):
        emp = attrs.get('nouvel_employe_beneficiaire')
        dir = attrs.get('nouvelle_direction_beneficiaire')
        
        if bool(emp) == bool(dir):
            raise serializers.ValidationError(
                "Choisir soit 'nouvel_employe_beneficiaire', "
                "soit 'nouvelle_direction_beneficiaire' (l'un des deux)."
            )
        
        # Validation de l'unité
        try:
            unite = UniteArticle.objects.select_related('article').get(
                unite_id=attrs['unite_id']
            )
        except UniteArticle.DoesNotExist:
            raise serializers.ValidationError({
                'unite_id': "Unité introuvable."
            })
        
        if unite.statut != UniteArticle.Statut.ATTRIBUE:
            raise serializers.ValidationError({
                'unite_id': "L'unité n'est pas attribuée."
            })
        
        if unite.etat in [UniteArticle.Etat.HORS_USAGE, UniteArticle.Etat.PERDU]:
            raise serializers.ValidationError({
                'unite_id': (
                    f"Impossible de transférer une unité dans l'état "
                    f"'{unite.get_etat_display()}'."
                )
            })
        
        # Vérifier que le nouveau bénéficiaire est différent
        ancien = unite.employe_beneficiaire or unite.direction_beneficiaire
        nouveau = emp or dir
        if ancien == nouveau:
            raise serializers.ValidationError(
                "Le nouveau bénéficiaire doit être différent de l'actuel."
            )
        
        # Règle métier : fourniture → direction uniquement
        if not unite.article.is_immobilisation and emp:
            raise serializers.ValidationError(
                "Une fourniture ne peut être transférée qu'à une direction."
            )
        
        return attrs
    
    def save(self, **kwargs):
        nouveau_beneficiaire = (
            self.validated_data.get('nouvel_employe_beneficiaire')
            or self.validated_data.get('nouvelle_direction_beneficiaire')
        )
        return transferer_unite(
            unite_id=self.validated_data['unite_id'],
            nouveau_beneficiaire=nouveau_beneficiaire,
            magasin_source=self.validated_data['magasin_source'],
            motif=self.validated_data.get('motif', ''),
        )
