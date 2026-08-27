from rest_framework import serializers

from .models import Action, Autoriser, Utilisateur


class UtilisateurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = ["utilisateur_id", "utilisateur_mail", "utilisateur_mdp"]
        extra_kwargs = {"utilisateur_mdp": {"write_only": True}}

class ActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Action
        fields = "__all__"

class AutoriserSerializer(serializers.ModelSerializer):
    class Meta:
        model = Autoriser
        fields = "__all__"