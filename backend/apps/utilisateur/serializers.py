from rest_framework import serializers

from .models import Action, Autoriser, Utilisateur


class UtilisateurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = ["utilisateur_id", "utilisateur_mail", "utilisateur_mdp"]  # noqa: RUF012
        extra_kwargs = {"utilisateur_mdp": {"write_only": True}}  # noqa: RUF012

class ActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Action
        fields = "__all__"

class AutoriserSerializer(serializers.ModelSerializer):
    class Meta:
        model = Autoriser
        fields = "__all__"