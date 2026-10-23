from rest_framework import serializers

#: Décisions possibles sur une attribution :
#: - VALIDEE : accordée (pré-validation) / livrée maintenant (validation finale) ;
#: - REFUSEE : refusée, avec un motif ;
#: - EN_ATTENTE : validation finale seulement, « en attente d'achat » (rien n'est livré pour l'instant).
DECISIONS = ["VALIDEE", "REFUSEE", "EN_ATTENTE"]


class AttributionValidationSerializer(serializers.Serializer):
    attribution_id = serializers.IntegerField()
    statut = serializers.ChoiceField(choices=DECISIONS)
    quantite_validee = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    motif_refus = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        allow_null=True
    )
    # Validation finale, livraison d'une partie seulement : sort de la quantité restante.
    reste = serializers.ChoiceField(choices=["EN_ATTENTE", "REFUSEE"], required=False, default="EN_ATTENTE")
    motif_reste = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        if attrs['statut'] == 'VALIDEE':  # noqa: SIM102
            if attrs.get('quantite_validee') is None or attrs['quantite_validee'] <= 0:
                raise serializers.ValidationError({
                    'quantite_validee': "Obligatoire et > 0 pour une validation."
                })
        return attrs
