from rest_framework import serializers
from django.utils import timezone

from .models import Commande, DetailCommande


class DetailCommandeSerializer(serializers.ModelSerializer):
    article_designation = serializers.CharField(source="article.designation", read_only=True)

    class Meta:
        model = DetailCommande
        fields = ["id", "commande", "article", "article_designation", "quantite"]
        read_only_fields = ["commande"]


class CommandeSerializer(serializers.ModelSerializer):
    details = DetailCommandeSerializer(many=True, required=False)
    demandeur_username = serializers.CharField(
        source="utilisateur_demandeur.nom_user", read_only=True
    )
    traitant_username = serializers.CharField(
        source="utilisateur_traitant.nom_user", read_only=True, default=None
    )

    class Meta:
        model = Commande
        fields = [
            "commande_id", "objet", "statut", "date_comande", "date_traitement",
            "commentaire_agent", "utilisateur_demandeur", "demandeur_username",
            "utilisateur_traitant", "traitant_username", "details",
        ]
        read_only_fields = [
            "date_comande", "date_traitement", "utilisateur_demandeur", "utilisateur_traitant",
        ]

    def create(self, validated_data):
        details_data = validated_data.pop("details", [])
        request = self.context["request"]
        commande = Commande.objects.create(
            utilisateur_demandeur=request.user, **validated_data
        )
        for detail in details_data:
            DetailCommande.objects.create(commande=commande, **detail)
        return commande


class CommandeTraitementSerializer(serializers.Serializer):
    """
    Serializer dedie a l'action de traitement d'une commande
    (transition de statut, distincte d'une simple mise a jour de champs).
    """
    statut = serializers.ChoiceField(
        choices=[Commande.Statut.VALIDEE, Commande.Statut.REJETEE]
    )
    commentaire_agent = serializers.CharField(required=False, allow_blank=True)

    def save(self, **kwargs):
        commande = self.context["commande"]
        request = self.context["request"]
        commande.statut = self.validated_data["statut"]
        commande.commentaire_agent = self.validated_data.get("commentaire_agent", "")
        commande.utilisateur_traitant = request.user
        commande.date_traitement = timezone.now()
        commande.save()
        return commande
