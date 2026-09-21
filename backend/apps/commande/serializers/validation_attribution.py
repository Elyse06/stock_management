from rest_framework import serializers


class AttributionValidationSerializer(serializers.Serializer):
    attribution_id = serializers.IntegerField()
    statut = serializers.ChoiceField(choices=['VALIDEE', 'REFUSEE'])
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

    def validate(self, attrs):
        if attrs['statut'] == 'VALIDEE':  # noqa: SIM102
            if attrs.get('quantite_validee') is None or attrs['quantite_validee'] <= 0:
                raise serializers.ValidationError({
                    'quantite_validee': "Obligatoire et > 0 pour une validation."
                })
        return attrs
