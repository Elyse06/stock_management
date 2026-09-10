from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.catalogue.models import Article
from apps.commande.models import Commande, DetailCommande
from apps.commande.services import generer_sortie_stock_pour_commande
from apps.common.permissions import HasAction
from apps.employee.models import Employer
from apps.stock.models import Magasin, UniteArticle


class DetailTraitementSerializer(serializers.Serializer):
    detail_id = serializers.IntegerField()
    unites_a_attribuer = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=[],
    )

class CommandeTraitementSerializer(serializers.Serializer):
    statut = serializers.ChoiceField(
        choices=[
            Commande.Statut.EN_COURS,
            Commande.Statut.VALIDEE,
            Commande.Statut.REJETEE,
        ]
    )
    commentaire_agent = serializers.CharField(required=False, allow_blank=True)
    magasin_source = serializers.PrimaryKeyRelatedField(
        queryset=Magasin.objects.all(), required=False, allow_null=True
    )
    employe_traitant = serializers.PrimaryKeyRelatedField(
        queryset=Employer.objects.select_related("emp_utilisateur_id"), required=False
    )

    details = DetailTraitementSerializer(many=True, required=False, default=[])

    def validate(self, attrs):
        commande = self.context["commande"]
        nouveau_statut = attrs.get("statut")
        magasin_source = attrs.get("magasin_source")
        details_data = attrs.get("details", [])

        if nouveau_statut == Commande.Statut.VALIDEE and not magasin_source:
            raise serializers.ValidationError({
                "magasin_source": "Le magasin source est requis pour valider la commande."
            })

        if details_data and nouveau_statut == Commande.Statut.VALIDEE:
            for detail_data in details_data:
                try:
                    detail = DetailCommande.objects.get(
                        id=detail_data["detail_id"],
                        commande=commande,
                    )
                except DetailCommande.DoesNotExist:
                    raise serializers.ValidationError({
                        "details": f"Détail #{detail_data['detail_id']} introuvable."
                    })

                article = detail.article
                unites_ids = detail_data.get("unites_a_attribuer", [])

                if article.mode_suivi == Article.ModeSuivi.NUMERO_SERIE:
                    if not unites_ids:
                        raise serializers.ValidationError({
                            "details": (
                                f"L'article '{article.designation}' nécessite "
                                f"{int(detail.quantite)} unité(s) à attribuer."
                            )
                        })
                    if len(unites_ids) != int(detail.quantite):
                        raise serializers.ValidationError({
                            "details": (
                                f"L'article '{article.designation}' nécessite "
                                f"exactement {int(detail.quantite)} unité(s), "
                                f"{len(unites_ids)} fournie(s)."
                            )
                        })
                    unites_existantes = UniteArticle.objects.filter(
                        unite_id__in=unites_ids,
                        article=article,
                        statut=UniteArticle.Statut.EN_STOCK,
                    )
                    if len(unites_existantes) != len(unites_ids):
                        raise serializers.ValidationError({
                            "details": (
                                f"Certaines unités pour '{article.designation}' "
                                f"n'existent pas ou ne sont pas en stock."
                            )
                        })

        return attrs

    @transaction.atomic
    def save(self, **kwargs):
        commande = self.context["commande"]
        request = self.context.get("request")
        details_data = self.validated_data.get("details", [])

        has_cat_gere = HasAction.for_actions("CAT_GERE")().has_permission(request, None)
        has_com_val = HasAction.for_actions("COM_VAL")().has_permission(request, None)
        status_actuel = commande.statut
        nouveau_statut = self.validated_data["statut"]

        if has_cat_gere and has_com_val:
            transitions_autorisees = {
                Commande.Statut.EN_COURS: [Commande.Statut.VALIDEE, Commande.Statut.REJETEE],
            }
        elif has_com_val:
            transitions_autorisees = {
                Commande.Statut.EN_ATTENTE: [Commande.Statut.EN_COURS, Commande.Statut.REJETEE]
            }
        else:
            transitions_autorisees = {}

        transitions_possibles = transitions_autorisees.get(status_actuel, [])
        if nouveau_statut not in transitions_possibles:
            raise serializers.ValidationError({
                "statut": f"Transition non autorisée : {status_actuel} -> {nouveau_statut}"
            })

        traitant = self.validated_data.get("employe_traitant")
        if traitant is None and request and request.user:
            traitant = Employer.objects.filter(
                emp_utilisateur_id_id=getattr(request.user, "pk", None)
            ).first()

        if traitant is None:
            raise serializers.ValidationError({"employe_traitant": "Employé traitant requis."})

        commande.statut = nouveau_statut
        commande.commentaire_agent = self.validated_data.get("commentaire_agent", "")
        commande.employe_traitant = traitant
        commande.date_traitement = timezone.now()
        commande.save()

        if nouveau_statut == Commande.Statut.VALIDEE:
            magasin_source = self.validated_data.get("magasin_source")
            generer_sortie_stock_pour_commande(
                commande,
                magasin_source,
                details_data,
            )

        return commande
    