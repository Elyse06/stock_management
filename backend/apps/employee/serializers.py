from rest_framework import serializers

from .models import Direction, Employer, Service, Site


class SiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Site
        fields = '__all__'

class DirectionSerializer(serializers.ModelSerializer):
    site_type = serializers.CharField(source='site.site_type', read_only=True)
    site_nom = serializers.CharField(source='site.site_nom', read_only=True)

    class Meta:
        model = Direction
        fields = '__all__'
        read_only_fields = ('dir_id',)

class ServiceSerializer(serializers.ModelSerializer):
    direction_libelle = serializers.CharField(source='serv_dir_id.dir_libelle', read_only=True)
    
    class Meta:
        model = Service
        fields = '__all__'
        read_only_fields = ('serv_id',)

class EmployerSerializer(serializers.ModelSerializer):
    service_libelle = serializers.CharField(source='emp_serv_id.serv_libelle', read_only=True)
    direction_libelle = serializers.SerializerMethodField()
    site_nom = serializers.SerializerMethodField()

    def get_direction_libelle(self, obj):
        direction = obj.direction
        return direction.dir_libelle if direction else None

    def get_site_nom(self, obj):
        site = obj.site
        return site.site_nom if site else None

    class Meta:
        model = Employer
        fields = '__all__'
        read_only_fields = ('emp_id',)