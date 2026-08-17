from rest_framework import serializers

from .models import Magasin, Mouvement, DetailMouvement, Inventaire


class MagasinSerializer(serializers.ModelSerializer):
    class Meta:
        model = Magasin
        fields = ["magasin_id", "nom", "localite"]


class DetailMouvementSerializer(serializers.ModelSerializer):
    article_designation = serializers.CharField(source="article.designation", read_only=True)

    class Meta:
        model = DetailMouvement
        fields = ["id", "mouvement", "article", "article_designation", "quantite"]
        read_only_fields = ["mouvement"]


class MouvementSerializer(serializers.ModelSerializer):
    details = DetailMouvementSerializer(many=True, required=False)
    magasin_source_nom = serializers.CharField(source="magasin_source.nom", read_only=True, default=None)
    magasin_destination_nom = serializers.CharField(source="magasin_destination.nom", read_only=True, default=None)

    class Meta:
        model = Mouvement
        fields = [
            "mouvement_id", "date", "type_mouvement", "origine", "motif",
            "magasin_source", "magasin_source_nom",
            "magasin_destination", "magasin_destination_nom",
            "details",
        ]
        read_only_fields = ["date"]

    def validate(self, attrs):
        type_mouvement = attrs.get("type_mouvement")
        source = attrs.get("magasin_source")
        destination = attrs.get("magasin_destination")

        if type_mouvement == Mouvement.Type.ENTREE and not destination:
            raise serializers.ValidationError("Une entree doit avoir un magasin de destination.")
        if type_mouvement == Mouvement.Type.SORTIE and not source:
            raise serializers.ValidationError("Une sortie doit avoir un magasin source.")
        if type_mouvement == Mouvement.Type.TRANSFERT and (not source or not destination):
            raise serializers.ValidationError("Un transfert doit avoir un magasin source ET destination.")
        if type_mouvement == Mouvement.Type.TRANSFERT and source == destination:
            raise serializers.ValidationError("Source et destination doivent etre differents pour un transfert.")
        return attrs

    def create(self, validated_data):
        details_data = validated_data.pop("details", [])
        mouvement = Mouvement.objects.create(**validated_data)
        for detail in details_data:
            DetailMouvement.objects.create(mouvement=mouvement, **detail)
        return mouvement


class InventaireSerializer(serializers.ModelSerializer):
    article_designation = serializers.CharField(source="article.designation", read_only=True)
    magasin_nom = serializers.CharField(source="magasin.nom", read_only=True)
    mouvement_details = MouvementSerializer(read_only=True)

    class Meta:
        model = Inventaire
        fields = [
            "inventaire_id", "article", "article_designation", "magasin", "magasin_nom",
            "mouvement", "mouvement_details",
            "quantite_theorique", "quantite_physique", "ecart", "date",
        ]
        read_only_fields = ["ecart", "date"]
