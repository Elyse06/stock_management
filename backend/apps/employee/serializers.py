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

class ServiceSerializer(serializers.ModelSerializer):
    direction_libelle = serializers.CharField(source='serv_dir_id.dir_libelle', read_only=True)
    
    class Meta:
        model = Service
        fields = '__all__'

class EmployerSerializer(serializers.ModelSerializer):
    service_libelle = serializers.CharField(source='emp_serv_id.serv_libelle', read_only=True)
    direction_libelle = serializers.CharField(source='emp_serv_id.serv_dir_id.dir_libelle', read_only=True)
    site_nom = serializers.CharField(source='emp_serv_id.serv_dir_id.site.site_nom', read_only=True)

    class Meta:
        model = Employer
        fields = '__all__'