from rest_framework import serializers


class DetailTraitementSerializer(serializers.Serializer):
    detail_id = serializers.IntegerField()
    unites_a_attribuer = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=[],
    )
