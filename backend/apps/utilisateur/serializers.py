from django.contrib.auth.hashers import make_password
from django.db import transaction
from rest_framework import serializers

from apps.employee.models import Employer

from .models import Action, Autoriser, Utilisateur


class UtilisateurSerializer(serializers.ModelSerializer):
    utilisateur_mdp = serializers.CharField(write_only=True, required=False, allow_blank=True)
    actions = serializers.ListField(child=serializers.CharField(), required=False, write_only=True)
    actions_liste = serializers.SerializerMethodField(read_only=True)
    emp_id_lie = serializers.SerializerMethodField(read_only=True)
    emp_id = serializers.CharField(required=False, allow_null=True, allow_blank=True, write_only=True)
    emp_nom = serializers.SerializerMethodField()
    emp_fonction = serializers.SerializerMethodField()
    direction_libelle = serializers.SerializerMethodField()
    role_id = serializers.SerializerMethodField(read_only=True)
    role_nom = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Utilisateur
        fields = [  # noqa: RUF012
            "utilisateur_id", "utilisateur_mail", "utilisateur_mdp",
            "actions", "actions_liste",
            "emp_id", "emp_id_lie", "emp_nom", "emp_fonction", "direction_libelle",
            "role_id", "role_nom",
        ]

    def get_actions_liste(self, obj):
        return list(
            Autoriser.objects.filter(autoriser_utilisateur_id=obj)
            .values_list("autoriser_action_id_id", flat=True)
            .order_by("autoriser_action_id_id")
        )

    def _employee(self, obj):
        return Employer.objects.filter(emp_utilisateur_id=obj).select_related(
            "emp_serv_id__serv_dir_id"
        ).first()

    def get_emp_nom(self, obj):
        employee = self._employee(obj)
        return employee.emp_nom if employee else None

    def get_emp_id_lie(self, obj):
        employee = self._employee(obj)
        return employee.emp_id if employee else None

    def get_emp_fonction(self, obj):
        employee = self._employee(obj)
        return employee.emp_fonction if employee else None

    def get_direction_libelle(self, obj):
        employee = self._employee(obj)
        return employee.direction.dir_libelle if employee and employee.direction else None

    def _role(self, obj):
        actions = set(self.get_actions_liste(obj))
        presets = {
            "GESTIONNAIRE": {"CAT_LIRE", "CAT_GERE", "MOV_LIRE", "INV_LIRE", "INV_GERE", "COM_DEM", "COM_VAL"},
            "VALIDATEUR_INV": {"CAT_LIRE", "MOV_LIRE", "INV_LIRE", "COM_DEM", "COM_VAL", "INV_VAL"},
            "VALIDATEUR_CMD": {"CAT_LIRE", "MOV_LIRE", "COM_DEM", "COM_VAL"},
            "STANDARD": {"CAT_LIRE", "MOV_LIRE", "COM_DEM"},
        }
        all_actions = set(Action.objects.values_list("action_id", flat=True))
        if actions == all_actions and all_actions:
            return "ADMIN", "Administrateur Système"
        for role_id, role_actions in presets.items():
            if actions == role_actions:
                return role_id, role_id.replace("_", " ").title()
        return "CUSTOM", "Profil Personnalisé"

    def get_role_id(self, obj):
        return self._role(obj)[0]

    def get_role_nom(self, obj):
        return self._role(obj)[1]

    def validate_actions(self, value):
        valid_ids = set(Action.objects.values_list("action_id", flat=True))
        unknown = sorted(set(value) - valid_ids)
        if unknown:
            raise serializers.ValidationError(f"Actions inconnues : {', '.join(unknown)}")
        return list(dict.fromkeys(value))

    def _sync_relations(self, instance, validated_data):
        action_ids = validated_data.pop("actions", None)
        emp_id = validated_data.pop("emp_id", serializers.empty)

        if action_ids is not None:
            Autoriser.objects.filter(autoriser_utilisateur_id=instance).exclude(
                autoriser_action_id_id__in=action_ids
            ).delete()
            existing = set(
                Autoriser.objects.filter(
                    autoriser_utilisateur_id=instance,
                    autoriser_action_id_id__in=action_ids,
                ).values_list("autoriser_action_id_id", flat=True)
            )
            Autoriser.objects.bulk_create(
                [
                    Autoriser(autoriser_utilisateur_id=instance, autoriser_action_id_id=action_id)
                    for action_id in set(action_ids) - existing
                ]
            )

        if emp_id is not serializers.empty:
            employee = None
            if emp_id:
                employee = Employer.objects.select_for_update().filter(pk=emp_id).first()
                if employee is None:
                    raise serializers.ValidationError({"emp_id": "Employé introuvable."})
                if employee.emp_utilisateur_id_id and employee.emp_utilisateur_id_id != instance.pk:
                    raise serializers.ValidationError(
                        {"emp_id": "Cet employé a déjà un compte utilisateur. Vous ne pouvez pas l'attribuer."}
                    )
            Employer.objects.filter(emp_utilisateur_id=instance).update(emp_utilisateur_id=None)
            if employee:
                employee.emp_utilisateur_id = instance
                employee.save(update_fields=["emp_utilisateur_id"])

    @transaction.atomic
    def create(self, validated_data):
        action_ids = validated_data.pop("actions", None)
        emp_id = validated_data.pop("emp_id", serializers.empty)
        password = validated_data.pop("utilisateur_mdp", "")
        if not password:
            raise serializers.ValidationError(
                {"utilisateur_mdp": "Le mot de passe est obligatoire à la création."}
            )
        validated_data["utilisateur_mdp"] = make_password(password)
        instance = super().create(validated_data)
        self._sync_relations(instance, {"actions": action_ids, "emp_id": emp_id})
        return instance

    @transaction.atomic
    def update(self, instance, validated_data):
        action_ids = validated_data.pop("actions", None)
        emp_id = validated_data.pop("emp_id", serializers.empty)
        password = validated_data.pop("utilisateur_mdp", "")
        if password:
            validated_data["utilisateur_mdp"] = make_password(password)
        instance = super().update(instance, validated_data)
        self._sync_relations(instance, {"actions": action_ids, "emp_id": emp_id})
        return instance

class ActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Action
        fields = "__all__"

class AutoriserSerializer(serializers.ModelSerializer):
    class Meta:
        model = Autoriser
        fields = "__all__"