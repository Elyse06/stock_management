from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.employee.models import Employer

from .acces import demander_envoi_acces, preparer_sans_mot_de_passe
from .models import Action, Autoriser, Utilisateur
from .roles import determiner_role


class UtilisateurSerializer(serializers.ModelSerializer):
    utilisateur_mdp = serializers.CharField(
        write_only=True, required=False, allow_blank=True, max_length=128,
        style={"input_type": "password"},
    )
    actions = serializers.ListField(child=serializers.CharField(), required=False, write_only=True)
    actions_liste = serializers.SerializerMethodField()
    emp_id_lie = serializers.SerializerMethodField()
    emp_id = serializers.CharField(required=False, allow_null=True, allow_blank=True, write_only=True)
    emp_nom = serializers.SerializerMethodField()
    emp_fonction = serializers.SerializerMethodField()
    direction_libelle = serializers.SerializerMethodField()
    role_id = serializers.SerializerMethodField()
    role_nom = serializers.SerializerMethodField()
    acces_expire = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = [  # noqa: RUF012
            "utilisateur_id", "utilisateur_mail", "utilisateur_mdp",
            "actions", "actions_liste",
            "emp_id", "emp_id_lie", "emp_nom", "emp_fonction", "direction_libelle",
            "role_id", "role_nom", "mdp_a_changer", "acces_envoye_le", "acces_expire",
        ]
        read_only_fields = ["mdp_a_changer", "acces_envoye_le"]  # noqa: RUF012

    def get_acces_expire(self, obj):
        if not obj.mdp_a_changer or obj.acces_envoye_le is None:
            return False
        return timezone.now() > obj.acces_envoye_le + timedelta(hours=settings.ACTIVATION_DUREE_HEURES)

    def _toutes_actions(self):
        if not hasattr(self, "_cache_toutes_actions"):
            self._cache_toutes_actions = set(Action.objects.values_list("action_id", flat=True))
        return self._cache_toutes_actions

    @staticmethod
    def _prefetch(obj, nom):
        return getattr(obj, "_prefetched_objects_cache", {}).get(nom)

    def get_actions_liste(self, obj):
        prefetch = self._prefetch(obj, "autoriser_set")
        if prefetch is not None:
            return sorted(a.autoriser_action_id_id for a in prefetch)
        return list(
            Autoriser.objects.filter(autoriser_utilisateur_id=obj)
            .order_by("autoriser_action_id_id")
            .values_list("autoriser_action_id_id", flat=True)
        )

    def _employee(self, obj):
        if not hasattr(obj, "_employe_lie"):
            prefetch = self._prefetch(obj, "employer_set")
            if prefetch is not None:
                obj._employe_lie = prefetch[0] if prefetch else None
            else:
                obj._employe_lie = (
                    Employer.objects.select_related("emp_dir_id", "emp_serv_id__serv_dir_id")
                    .filter(emp_utilisateur_id=obj)
                    .first()
                )
        return obj._employe_lie

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
        direction = employee.direction if employee else None
        return direction.dir_libelle if direction else None

    def _role(self, obj):
        if not hasattr(obj, "_role_calcule"):
            obj._role_calcule = determiner_role(self.get_actions_liste(obj), self._toutes_actions())
        return obj._role_calcule

    def get_role_id(self, obj):
        return self._role(obj)[0]

    def get_role_nom(self, obj):
        return self._role(obj)[1]

    def validate_actions(self, value):
        inconnues = sorted(set(value) - self._toutes_actions())
        if inconnues:
            raise serializers.ValidationError(f"Actions inconnues : {', '.join(inconnues)}")
        return list(dict.fromkeys(value))

    def validate_utilisateur_mdp(self, value):
        if value:
            try:
                validate_password(value)
            except DjangoValidationError as exc:
                raise serializers.ValidationError(list(exc.messages)) from exc
        return value

    def _synchroniser_actions(self, instance, action_ids):
        if action_ids is None:
            return
        Autoriser.objects.filter(autoriser_utilisateur_id=instance).exclude(
            autoriser_action_id_id__in=action_ids
        ).delete()
        existantes = set(
            Autoriser.objects.filter(autoriser_utilisateur_id=instance)
            .values_list("autoriser_action_id_id", flat=True)
        )
        Autoriser.objects.bulk_create([
            Autoriser(autoriser_utilisateur_id=instance, autoriser_action_id_id=action_id)
            for action_id in action_ids
            if action_id not in existantes
        ])

    def _synchroniser_employe(self, instance, emp_id):
        if emp_id is serializers.empty:
            return
        employee = None
        if emp_id:
            employee = Employer.objects.select_for_update().filter(pk=emp_id).first()
            if employee is None:
                raise serializers.ValidationError({"emp_id": "Employé introuvable."})
            if employee.emp_utilisateur_id_id and employee.emp_utilisateur_id_id != instance.pk:
                raise serializers.ValidationError({
                    "emp_id": "Cet employé a déjà un compte utilisateur. Vous ne pouvez pas l'attribuer."
                })
        Employer.objects.filter(emp_utilisateur_id=instance).exclude(
            pk=getattr(employee, "pk", None)
        ).update(emp_utilisateur_id=None)
        if employee and employee.emp_utilisateur_id_id != instance.pk:
            employee.emp_utilisateur_id = instance
            employee.save(update_fields=["emp_utilisateur_id"])

    @transaction.atomic
    def create(self, validated_data):
        action_ids = validated_data.pop("actions", None)
        emp_id = validated_data.pop("emp_id", serializers.empty)
        password = validated_data.pop("utilisateur_mdp", "")
        instance = Utilisateur(**validated_data)
        if password:
            instance.utilisateur_mdp = make_password(password)
        else:
            preparer_sans_mot_de_passe(instance)
        instance.save()
        self._synchroniser_actions(instance, action_ids)
        self._synchroniser_employe(instance, emp_id)
        if not password:
            demander_envoi_acces(instance)
        return instance

    @transaction.atomic
    def update(self, instance, validated_data):
        action_ids = validated_data.pop("actions", None)
        emp_id = validated_data.pop("emp_id", serializers.empty)
        password = validated_data.pop("utilisateur_mdp", "")
        if password:
            instance.utilisateur_mdp = make_password(password)
        for champ, valeur in validated_data.items():
            setattr(instance, champ, valeur)
        instance.save()
        self._synchroniser_actions(instance, action_ids)
        self._synchroniser_employe(instance, emp_id)
        for cache in ("_employe_lie", "_role_calcule", "_prefetched_objects_cache"):
            instance.__dict__.pop(cache, None)
        return instance


class ActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Action
        fields = "__all__"


class AutoriserSerializer(serializers.ModelSerializer):
    class Meta:
        model = Autoriser
        fields = "__all__"
