from rest_framework import serializers

from apps.commande.models import DetailCommande

from .attribution_detail_commande import AttributionDetailCommandeSerializer


class DetailCommandeSerializer(serializers.ModelSerializer):
    """Ligne de commande : ``article`` (article existant) **ou** ``specification`` (nouvel article)."""

    article_designation = serializers.CharField(source="article.designation", read_only=True, default=None)
    libelle = serializers.CharField(read_only=True)
    est_nouvel_article = serializers.BooleanField(read_only=True)
    specification = serializers.CharField(max_length=255, required=False, allow_blank=True, trim_whitespace=True)
    attributions = AttributionDetailCommandeSerializer(many=True, required=False)

    class Meta:
        model = DetailCommande
        fields = [  # noqa: RUF012
            "id",
            "commande",
            "article",
            "article_designation",
            "specification",
            "est_nouvel_article",
            "libelle",
            "quantite",
            "attributions",
        ]
        read_only_fields = ["commande"]  # noqa: RUF012
        extra_kwargs = {"article": {"required": False, "allow_null": True}}  # noqa: RUF012

    def validate(self, attrs):
        article = attrs.get("article", getattr(self.instance, "article", None))
        specification = attrs.get("specification", getattr(self.instance, "specification", "")) or ""
        if self.instance is None:
            if article is None and not specification:
                raise serializers.ValidationError(
                    "Choisissez un article existant ou décrivez le nouvel article souhaité."
                )
            if article is not None and specification:
                raise serializers.ValidationError(
                    "Une ligne porte soit un article existant, soit la spécification d'un nouvel article, pas les deux."
                )
        quantite_totale = attrs.get("quantite", getattr(self.instance, "quantite", 0))
        if quantite_totale is not None and quantite_totale <= 0:
            raise serializers.ValidationError({"quantite": "La quantité doit être supérieure à 0."})
        attributions = attrs.get("attributions", [])
        if attributions:
            somme_attributions = sum(attr.get("quantite") or 0 for attr in attributions)
            if somme_attributions > quantite_totale:
                raise serializers.ValidationError({
                    "attributions": (
                        f"La somme des attributions ({somme_attributions}) ne peut pas "
                        f"dépasser la quantité totale de l'article ({quantite_totale})."
                    )
                })
        return attrs
