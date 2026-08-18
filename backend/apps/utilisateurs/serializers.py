from rest_framework import serializers

from .models import Profil, Employe, Utilisateur


class ProfilSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profil
        fields = ["profil_id", "nom", "description"]


class EmployeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employe
        fields = ["employee_id", "nom", "matricule", "departement", "fonction", "telephone", "adresse", "chef_hierarchique"]


class UtilisateurSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    profil_nom = serializers.CharField(source="profil.nom", read_only=True)
    employe_matricule = serializers.CharField(source="employe.matricule", read_only=True)

    class Meta:
        model = Utilisateur
        fields = [
            "id", "nom_user", "email",
            "profil", "profil_nom", "employe", "employe_matricule", "password", "date_creation",
        ]
        read_only_fields = ["date_creation"]

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = Utilisateur(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user
