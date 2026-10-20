from django.db import transaction
from rest_framework import serializers

from apps.common.employees import get_request_employee
from apps.employee.models import Direction
from apps.stock.models import InventaireSession, LigneInventaire
from apps.stock.utils import calculer_stock_theorique, generer_code_reference

from .ligne_inventaire import LigneInventaireSerializer


class InventaireSessionSerializer(serializers.ModelSerializer):
    lignes = LigneInventaireSerializer(many=True, required=False)
    lieu_nom = serializers.SerializerMethodField()
    service = serializers.PrimaryKeyRelatedField(
        queryset=Direction.objects.all(),
        source='direction', required=False, allow_null=True, write_only=True
    )
    service_libelle = serializers.CharField(
        source='direction.dir_libelle', read_only=True, default=None
    )
    site_nom = serializers.CharField(source="site.site_nom", read_only=True, default=None)
    salle_nom = serializers.CharField(source="salle.nom", read_only=True, default=None)
    realise_par_nom = serializers.CharField(source="realise_par.emp_nom", read_only=True, default=None)
    valide_par_nom = serializers.CharField(source="valide_par.emp_nom", read_only=True, default=None)

    class Meta:
        model = InventaireSession
        fields = [  # noqa: RUF012
            "inventaire_id", "code_reference", "date_creation", "date_validation", "statut",
            "magasin", "service", "service_libelle", "site", "site_nom",
            "salle", "salle_nom", "lieu_nom", "type_articles", "realise_par_nom", "valide_par_nom", "lignes",
        ]
        read_only_fields = ["code_reference", "statut", "date_creation", "date_validation"]  # noqa: RUF012

    def get_lieu_nom(self, obj):
        if obj.magasin:
            return f"Magasin: {obj.magasin.magasin_nom}"
        if obj.direction:
            return f"Direction: {obj.direction.dir_libelle}"
        if obj.site:
            return f"Site: {obj.site.site_nom}"
        if obj.salle:
            return f"Salle: {obj.salle.nom}"
        return "N/A"

    def validate(self, attrs):
        magasin = attrs.get("magasin", getattr(self.instance, "magasin", None))
        direction = attrs.get("direction", getattr(self.instance, "direction", None))
        site = attrs.get("site", getattr(self.instance, "site", None))
        salle = attrs.get("salle", getattr(self.instance, "salle", None))

        lieux = [magasin, direction, site, salle]
        if sum(lieu is not None for lieu in lieux) != 1:
            raise serializers.ValidationError(
                "Veuillez sélectionner exactement un lieu : magasin, site, direction ou salle."
            )
        if site and site.site_type != "AGENCE":
            raise serializers.ValidationError(
                "Un inventaire direct par site est réservé aux agences; "
                "pour un siège, choisissez une direction ou une salle."
            )
        # Session « immobilisations » ou « fournitures » : seulement des articles de ce type.
        type_articles = attrs.get("type_articles", getattr(self.instance, "type_articles", ""))
        if type_articles:
            immobilisation = type_articles == InventaireSession.TypeArticles.IMMOBILISATION
            intrus = [ligne["article"].code_article for ligne in attrs.get("lignes", [])
                      if ligne["article"].is_immobilisation != immobilisation]
            if intrus:
                raise serializers.ValidationError(
                    f"Inventaire des {InventaireSession.TypeArticles(type_articles).label.lower()} : "
                    f"article(s) d'un autre type ({', '.join(intrus[:5])})."
                )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        lignes_data = validated_data.pop("lignes", [])
        magasin = validated_data.get("magasin")
        direction = validated_data.get("direction")
        site = validated_data.get("site")
        salle = validated_data.get("salle")

        validated_data["code_reference"] = generer_code_reference()
        request = self.context.get("request")
        validated_data["realise_par"] = get_request_employee(request) if request else None
        session = InventaireSession.objects.create(**validated_data)

        for ligne_data in lignes_data:
            article = ligne_data.get("article")
            stock_theorique = calculer_stock_theorique(
                article=article,
                magasin=magasin,
                direction=direction,
                site=site,
                salle=salle,
            )
            ligne_data["quantite_theorique"] = stock_theorique
            LigneInventaire.objects.create(session=session, **ligne_data)

        return session
