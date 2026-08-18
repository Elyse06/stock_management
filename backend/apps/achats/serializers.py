from rest_framework import serializers
from django.utils import timezone

from apps.stock.models import DetailMouvement, Magasin, Mouvement

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
    magasin_source = serializers.PrimaryKeyRelatedField(
        queryset=Magasin.objects.all(),
        required=False,
        allow_null=True,
    )

    def _creer_sortie_stock(self, commande, magasin_source=None):
        magasin_selectionne = magasin_source or Magasin.objects.order_by("magasin_id").first()
        if magasin_selectionne is None:
            raise serializers.ValidationError("Aucun magasin n'est disponible pour enregistrer la sortie de stock.")

        origine = f"Commande de {commande.utilisateur_demandeur.nom_user}"
        motif = commande.objet or "Commande interne"

        if Mouvement.objects.filter(
            type_mouvement=Mouvement.Type.SORTIE,
            magasin_source=magasin_selectionne,
            origine=origine,
            motif=motif,
        ).exists():
            return None

        mouvement = Mouvement.objects.create(
            type_mouvement=Mouvement.Type.SORTIE,
            magasin_source=magasin_selectionne,
            origine=origine,
            motif=motif,
        )

        for detail in commande.details.select_related("article"):
            DetailMouvement.objects.create(
                mouvement=mouvement,
                article=detail.article,
                quantite=int(detail.quantite),
            )

        return mouvement

    def save(self, **kwargs):
        commande = self.context["commande"]
        request = self.context["request"]
        nouveau_statut = self.validated_data["statut"]

        commande.statut = nouveau_statut
        commande.commentaire_agent = self.validated_data.get("commentaire_agent", "")
        commande.utilisateur_traitant = request.user
        commande.date_traitement = timezone.now()
        commande.save()

        if nouveau_statut == Commande.Statut.VALIDEE:
            self._creer_sortie_stock(
                commande,
                self.validated_data.get("magasin_source"),
            )

        return commande
