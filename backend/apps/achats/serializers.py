from django.utils import timezone
from rest_framework import serializers

from apps.employee.models import Employer
from apps.stock.models import DetailMouvement, Magasin, Mouvement

from .models import Commande, DetailCommande


class DetailCommandeSerializer(serializers.ModelSerializer):
    article_designation = serializers.CharField(source="article.designation", read_only=True)

    class Meta:
        model = DetailCommande
        fields = ["id", "commande", "article", "article_designation", "quantite"] # noqa: RUF012
        read_only_fields = ["commande"]  # noqa: RUF012


class CommandeSerializer(serializers.ModelSerializer):
    details = DetailCommandeSerializer(many=True, required=False)
    demandeur = serializers.SerializerMethodField()
    traitant = serializers.SerializerMethodField()

    def _employee_data(self, employee):
        if employee is None:
            return None
        return {
            "emp_id": employee.emp_id,
            "nom": employee.emp_nom,
            "matricule": employee.emp_matricule,
            "contact": employee.emp_contact,
            "fonction": employee.emp_fonction,
            "service": employee.emp_serv_id.serv_libelle if employee.emp_serv_id else None,
        }

    def get_demandeur(self, obj):
        return self._employee_data(obj.employe_demandeur)

    def get_traitant(self, obj):
        return self._employee_data(obj.employe_traitant)

    class Meta:
        model = Commande
        fields = [  # noqa: RUF012
            "commande_id", "objet", "statut", "date_comande", "date_traitement",
            "commentaire_agent", "employe_demandeur", "demandeur",
            "employe_traitant", "traitant", "details",
        ]
        read_only_fields = [  # noqa: RUF012
            "date_comande", "date_traitement", "employe_traitant",
        ]

    def create(self, validated_data):
        details_data = validated_data.pop("details", [])
        request = self.context["request"]
        demandeur = validated_data.get("employe_demandeur")
        if demandeur is None:
            demandeur = Employer.objects.filter(
                emp_utilisateur_id_id=getattr(request.user, "pk", None)
            ).first()
        if demandeur is None:
            raise serializers.ValidationError({
                "employe_demandeur": "L'identifiant de l'employé demandeur est requis."
            })
        commande = Commande.objects.create(
            employe_demandeur=demandeur, **validated_data
        )
        for detail in details_data:
            DetailCommande.objects.create(commande=commande, **detail)
        return commande


class CommandeTraitementSerializer(serializers.Serializer):
    """Serializer dedie a l'action de traitement d'une commande."""
    statut = serializers.ChoiceField(
        choices=[
            Commande.Statut.EN_COURS,
            Commande.Statut.VALIDEE,
            Commande.Statut.REJETEE,
        ]
    )
    commentaire_agent = serializers.CharField(required=False, allow_blank=True)
    magasin_source = serializers.PrimaryKeyRelatedField(
        queryset=Magasin.objects.all(),
        required=False,
        allow_null=True,
    )
    employe_traitant = serializers.PrimaryKeyRelatedField(
        queryset=Employer.objects.select_related("emp_utilisateur_id"), required=False
    )

    def _creer_sortie_stock(self, commande, magasin_source=None):
        magasin_selectionne = magasin_source or Magasin.objects.order_by("magasin_id").first()
        if magasin_selectionne is None:
            raise serializers.ValidationError("Aucun magasin n'est disponible pour enregistrer la sortie de stock.")

        origine = f"Commande de {commande.employe_demandeur.emp_nom} ({commande.employe_demandeur.emp_matricule})"
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
        traitant = self.validated_data.get("employe_traitant")
        if traitant is None:
            traitant = Employer.objects.filter(
                emp_utilisateur_id_id=getattr(request.user, "pk", None)
            ).first()
        if traitant is None:
            raise serializers.ValidationError({
                "employe_traitant": "L'identifiant de l'employé traitant est requis."
            })
        commande.employe_traitant = traitant
        commande.date_traitement = timezone.now()
        commande.save()

        if nouveau_statut == Commande.Statut.VALIDEE:
            self._creer_sortie_stock(
                commande,
                self.validated_data.get("magasin_source"),
            )

        return commande
