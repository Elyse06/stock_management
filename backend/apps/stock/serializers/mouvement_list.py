from rest_framework import serializers

from apps.stock.models import Mouvement


class MouvementListSerializer(serializers.ModelSerializer):
    magasin_source_nom = serializers.CharField(
        source="magasin_source.magasin_nom", read_only=True, default=None
    )
    magasin_destination_nom = serializers.CharField(
        source="magasin_destination.magasin_nom", read_only=True, default=None
    )
    nb_articles = serializers.IntegerField(read_only=True)
    quantite_totale = serializers.IntegerField(read_only=True)

    class Meta:
        model = Mouvement
        fields = [  # noqa: RUF012
            "mouvement_id", "date", "type_mouvement", "origine", "motif",
            "magasin_source", "magasin_source_nom",
            "magasin_destination", "magasin_destination_nom",
            "nb_articles", "quantite_totale",
        ]
        read_only_fields = fields  # noqa: RUF012
