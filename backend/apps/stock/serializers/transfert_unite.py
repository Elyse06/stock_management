from apps.employee.models import Direction, Employer, Site
from apps.stock.models import Affectation, Magasin, Salle, UniteArticle
from apps.stock.services import transferer_unite
from rest_framework import serializers


class TransfertUniteSerializer(serializers.Serializer):
    unite_id = serializers.IntegerField()
    nouvel_employe_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Employer.objects.all(), required=False, allow_null=True,
    )
    nouvelle_direction_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Direction.objects.all(), required=False, allow_null=True,
    )
    nouvelle_salle_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Salle.objects.all(), required=False, allow_null=True,
    )
    nouveau_site_beneficiaire = serializers.PrimaryKeyRelatedField(
        queryset=Site.objects.all(), required=False, allow_null=True,
    )
    magasin_source = serializers.PrimaryKeyRelatedField(queryset=Magasin.objects.all())
    motif = serializers.CharField(required=False, allow_blank=True, default="")
    
    def validate(self, attrs):
        emp = attrs.get('nouvel_employe_beneficiaire')
        dir = attrs.get('nouvelle_direction_beneficiaire')
        salle = attrs.get('nouvelle_salle_beneficiaire')
        site = attrs.get('nouveau_site_beneficiaire')
        
        if sum(beneficiaire is not None for beneficiaire in (emp, dir, salle, site)) != 1:
            raise serializers.ValidationError(
                "Choisir exactement un nouveau bénéficiaire : employé, direction, salle ou site."
            )
        
        try:
            unite = UniteArticle.objects.select_related(
                'article', 'affectation', 'affectation__employe',
                'affectation__direction', 'affectation__salle', 'affectation__site',
            ).get(unite_id=attrs['unite_id'])
        except UniteArticle.DoesNotExist:
            raise serializers.ValidationError({
                'unite_id': "Unité introuvable."
            })
        
        if unite.statut != UniteArticle.Statut.ATTRIBUE:
            raise serializers.ValidationError({
                'unite_id': "L'unité n'est pas attribuée."
            })
        
        if unite.etat in [UniteArticle.Etat.HORS_USAGE, UniteArticle.Etat.PERDU]:
            raise serializers.ValidationError({
                'unite_id': (
                    f"Impossible de transférer une unité dans l'état "
                    f"'{unite.get_etat_display()}'."
                )
            })
        
        ancien = unite.affectation.cible if unite.affectation_id else None
        nouveau = emp or dir or salle or site
        if ancien == nouveau:
            raise serializers.ValidationError(
                "Le nouveau bénéficiaire doit être différent de l'actuel."
            )
        
        if not unite.article.is_immobilisation and emp:
            raise serializers.ValidationError(
                "Une fourniture ne peut pas être transférée à un employé."
            )
        
        return attrs
    
    def save(self, **kwargs):
        nouveau_beneficiaire = (
            self.validated_data.get('nouvel_employe_beneficiaire')
            or self.validated_data.get('nouvelle_direction_beneficiaire')
            or self.validated_data.get('nouvelle_salle_beneficiaire')
            or self.validated_data.get('nouveau_site_beneficiaire')
        )
        return transferer_unite(
            unite_id=self.validated_data['unite_id'],
            nouveau_beneficiaire=nouveau_beneficiaire,
            magasin_source=self.validated_data['magasin_source'],
            motif=self.validated_data.get('motif', ''),
        )