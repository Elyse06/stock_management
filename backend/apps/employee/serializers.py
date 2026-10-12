from rest_framework import serializers

from .models import Direction, Employer, Service, Site


class SiteSerializer(serializers.ModelSerializer):
    directions_count = serializers.IntegerField(read_only=True)
    employees_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Site
        fields = "__all__"


class DirectionSerializer(serializers.ModelSerializer):
    services_count = serializers.IntegerField(read_only=True)
    employees_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Direction
        fields = "__all__"
        read_only_fields = ("dir_id",)
        extra_kwargs = {"dir_description": {"allow_blank": True, "required": False}}  # noqa: RUF012


class ServiceSerializer(serializers.ModelSerializer):
    direction_libelle = serializers.CharField(source="serv_dir_id.dir_libelle", read_only=True)
    employees_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Service
        fields = "__all__"
        read_only_fields = ("serv_id",)
        extra_kwargs = {"serv_info": {"allow_blank": True, "required": False}}  # noqa: RUF012


class EmployerSerializer(serializers.ModelSerializer):
    service_libelle = serializers.CharField(source="emp_serv_id.serv_libelle", read_only=True)
    direction_libelle = serializers.SerializerMethodField()
    site_nom = serializers.SerializerMethodField()

    class Meta:
        model = Employer
        fields = "__all__"
        read_only_fields = ("emp_id",)
        extra_kwargs = {"emp_contact": {"allow_blank": True, "required": False}}  # noqa: RUF012

    def get_direction_libelle(self, obj):
        direction = obj.direction
        return direction.dir_libelle if direction else None

    def get_site_nom(self, obj):
        return obj.emp_site_id.site_nom if obj.emp_site_id else None
