from rest_framework import serializers

from apps.employee.models import Direction, Employer, Site
from apps.stock.models import DemandeUnite, Salle


def _item(affectation):
    """Bénéficiaire au format du sélecteur de l'interface (pré-remplissage de la fenêtre de transfert)."""
    if affectation.employe_id:
        e = affectation.employe
        return {"emp_id": e.pk, "emp_nom": e.emp_nom, "emp_matricule": e.emp_matricule}
    if affectation.direction_id:
        return {"dir_id": affectation.direction_id, "dir_libelle": affectation.direction.dir_libelle}
    if affectation.site_id:
        return {"site_id": affectation.site_id, "site_nom": affectation.site.site_nom, "site_type": affectation.site.site_type}
    if affectation.salle_id:
        return {"salle_id": affectation.salle_id, "nom": affectation.salle.nom}
    return None


def _beneficiaire(affectation):
    if affectation is None:
        return None
    cible = affectation.cible
    return {"type": affectation.beneficiaire_type, "id": cible.pk if cible else None, "nom": affectation.nom, "item": _item(affectation)}


class DemandeUniteSerializer(serializers.ModelSerializer):
    type_label = serializers.CharField(source="get_type_demande_display", read_only=True)
    statut_label = serializers.CharField(source="get_statut_display", read_only=True)
    unite_id = serializers.IntegerField(source="unite.unite_id", read_only=True)
    article_designation = serializers.CharField(source="unite.article.designation", read_only=True)
    article_code = serializers.CharField(source="unite.article.code_article", read_only=True)
    numero_de_serie = serializers.CharField(source="unite.numero_de_serie", read_only=True)
    etat = serializers.CharField(source="unite.etat", read_only=True)
    demandeur_nom = serializers.CharField(source="demandeur.emp_nom", read_only=True, default="")
    traitant_nom = serializers.CharField(source="traitant.emp_nom", read_only=True, default="")
    beneficiaire_actuel = serializers.SerializerMethodField()
    nouveau_beneficiaire = serializers.SerializerMethodField()

    class Meta:
        model = DemandeUnite
        fields = [  # noqa: RUF012
            "demande_id", "type_demande", "type_label", "statut", "statut_label", "unite_id", "article_designation",
            "article_code", "numero_de_serie", "etat", "demandeur_nom", "beneficiaire_actuel", "nouveau_beneficiaire",
            "motif", "date_demande", "date_traitement", "traitant_nom", "commentaire_traitement", "mouvement",
        ]

    def get_beneficiaire_actuel(self, obj):
        return _beneficiaire(obj.affectation_origine)

    def get_nouveau_beneficiaire(self, obj):
        return _beneficiaire(obj.nouvelle_affectation)


class CreationDemandeUniteSerializer(serializers.Serializer):
    """Création : une unité, un type, un motif ; pour un transfert, exactement un nouveau bénéficiaire."""

    unite_id = serializers.IntegerField()
    type_demande = serializers.ChoiceField(choices=DemandeUnite.Type.choices)
    motif = serializers.CharField(required=False, allow_blank=True, default="", max_length=1000)
    nouvel_employe_beneficiaire = serializers.PrimaryKeyRelatedField(queryset=Employer.objects.all(), required=False, allow_null=True)
    nouvelle_direction_beneficiaire = serializers.PrimaryKeyRelatedField(queryset=Direction.objects.all(), required=False, allow_null=True)
    nouvelle_salle_beneficiaire = serializers.PrimaryKeyRelatedField(queryset=Salle.objects.all(), required=False, allow_null=True)
    nouveau_site_beneficiaire = serializers.PrimaryKeyRelatedField(queryset=Site.objects.all(), required=False, allow_null=True)

    CHAMPS_BENEFICIAIRE = ("nouvel_employe_beneficiaire", "nouvelle_direction_beneficiaire",
                           "nouvelle_salle_beneficiaire", "nouveau_site_beneficiaire")

    def validate(self, attrs):
        renseignes = [attrs[c] for c in self.CHAMPS_BENEFICIAIRE if attrs.get(c)]
        if attrs["type_demande"] == DemandeUnite.Type.TRANSFERT and len(renseignes) != 1:
            raise serializers.ValidationError({"nouveau_beneficiaire": "Indiquez un seul nouveau bénéficiaire."})
        if attrs["type_demande"] == DemandeUnite.Type.RETOUR and renseignes:
            raise serializers.ValidationError({"nouveau_beneficiaire": "Un retour en stock n'a pas de nouveau bénéficiaire."})
        attrs["nouveau_beneficiaire"] = renseignes[0] if renseignes else None
        return attrs
