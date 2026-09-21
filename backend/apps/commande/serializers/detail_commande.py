from rest_framework import serializers

from apps.commande.models import DetailCommande

from .attribution_detail_commande import AttributionDetailCommandeSerializer


class DetailCommandeSerializer(serializers.ModelSerializer):
    article_designation = serializers.CharField(
        source="article.designation", read_only=True
    )
    attributions = AttributionDetailCommandeSerializer(many=True, required=False)

    class Meta:
        model = DetailCommande
        fields = [  # noqa: RUF012
            "id",
            "commande",
            "article",
            "article_designation",
            "quantite",
            "attributions",
        ]
        read_only_fields = ["commande"]  # noqa: RUF012

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
