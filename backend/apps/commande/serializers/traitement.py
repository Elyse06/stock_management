from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.catalogue.models import Article
from apps.commande.models import AttributionDetailCommande, Commande, DetailCommande
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


class AttributionValidationSerializer(serializers.Serializer):
    attribution_id = serializers.IntegerField()
    statut = serializers.ChoiceField(choices=['VALIDEE', 'REFUSEE'])
    quantite_validee = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    motif_refus = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True
    )

    def validate(self, attrs):
        if attrs['statut'] == 'VALIDEE':
            if attrs.get('quantite_validee') is None or attrs['quantite_validee'] <= 0:
                raise serializers.ValidationError({
                    'quantite_validee': "Obligatoire et > 0 pour une validation."
                })
        elif attrs['statut'] == 'REFUSEE':
            if not attrs.get('motif_refus'):
                raise serializers.ValidationError({
                    'motif_refus': "Obligatoire pour un refus."
                })
        return attrs


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
        queryset=Employer.objects.select_related("emp_utilisateur_id"),
        required=False
    )
    details = DetailTraitementSerializer(many=True, required=False, default=[])
    # Liste des décisions de validation par attribution
    validations = AttributionValidationSerializer(many=True, required=False, default=[])

    def validate(self, attrs):
        commande = self.context["commande"]
        nouveau_statut = attrs.get("statut")
        magasin_source = attrs.get("magasin_source")
        details_data = attrs.get("details", [])
        validations = attrs.get("validations", [])

        # Validation du magasin source
        if nouveau_statut == Commande.Statut.VALIDEE and not magasin_source:
            raise serializers.ValidationError({
                "magasin_source": "Le magasin source est requis pour valider la commande."
            })

        # validation des décisions d'attributions
        if nouveau_statut == Commande.Statut.VALIDEE:
            attributions_commande = AttributionDetailCommande.objects.filter(
                detail_commande__commande=commande
            )

            # 1. Vérifier que toutes les attributions sont traitées
            attributions_traitees_ids = {v['attribution_id'] for v in validations}
            attributions_commande_ids = set(
                attributions_commande.values_list('id', flat=True)
            )
            attributions_manquantes = attributions_commande_ids - attributions_traitees_ids

            if attributions_manquantes:
                raise serializers.ValidationError({
                    "validations": (
                        f"Attributions non traitées : {sorted(attributions_manquantes)}. "
                        f"Chaque attribution doit être validée ou refusée."
                    )
                })

            # 2. Vérifier qu'aucune attribution étrangère n'est incluse
            attributions_etrangeres = attributions_traitees_ids - attributions_commande_ids
            if attributions_etrangeres:
                raise serializers.ValidationError({
                    "validations": (
                        f"Attributions étrangères à la commande : {sorted(attributions_etrangeres)}."
                    )
                })

            # 3. Vérifier qu'au moins une attribution est validée
            validations_validees = [v for v in validations if v['statut'] == 'VALIDEE']
            if not validations_validees:
                raise serializers.ValidationError({
                    "validations": (
                        "Au moins une attribution doit être validée pour valider la commande."
                    )
                })

            # 4. Validation des unités pour les immobilisations validées
            for validation in validations_validees:
                try:
                    attribution = attributions_commande.get(id=validation['attribution_id'])
                except AttributionDetailCommande.DoesNotExist:
                    continue

                article = attribution.detail_commande.article
                quantite_validee = int(validation['quantite_validee'])

                # Vérifier que quantite_validee <= quantite_demandee
                if quantite_validee > attribution.quantite_demandee:
                    raise serializers.ValidationError({
                        "validations": (
                            f"Attribution #{validation['attribution_id']}: "
                            f"la quantité validée ({quantite_validee}) ne peut pas dépasser "
                            f"la quantité demandée ({attribution.quantite_demandee})."
                        )
                    })

                if article.is_immobilisation:
                    # Vérifier qu'il y a assez d'unités en stock
                    unites_disponibles = UniteArticle.objects.filter(
                        article=article,
                        statut=UniteArticle.Statut.EN_STOCK
                    ).count()

                    if unites_disponibles < quantite_validee:
                        raise serializers.ValidationError({
                            "validations": (
                                f"Stock insuffisant pour '{article.designation}' "
                                f"(attribution #{validation['attribution_id']}): "
                                f"{quantite_validee} demandé(s), "
                                f"{unites_disponibles} disponible(s)."
                            )
                        })

        # Validation existante des détails (unités à attribuer)
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

                if article.is_immobilisation:
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

                    if article.mode_suivi == Article.ModeSuivi.NUMERO_SERIE:
                        unites_sans_serie = unites_existantes.filter(
                            numero_de_serie__isnull=True
                        )
                        if unites_sans_serie.exists():
                            ids_manquants = list(
                                unites_sans_serie.values_list('unite_id', flat=True)
                            )
                            raise serializers.ValidationError({
                                "details": (
                                    f"Les unités {ids_manquants} pour l'article "
                                    f"'{article.designation}' n'ont pas de numéro de série "
                                    f"(obligatoire pour ce mode de suivi)."
                                )
                            })

        return attrs

    @transaction.atomic
    def save(self, **kwargs):
        commande = self.context["commande"]
        request = self.context.get("request")
        details_data = self.validated_data.get("details", [])
        validations = self.validated_data.get("validations", [])

        has_cat_gere = HasAction.for_actions("CAT_GERE")().has_permission(request, None)
        has_com_val = HasAction.for_actions("COM_VAL")().has_permission(request, None)
        status_actuel = commande.statut
        nouveau_statut = self.validated_data["statut"]

        if has_cat_gere and has_com_val:
            transitions_autorisees = {
                Commande.Statut.EN_COURS: [
                    Commande.Statut.VALIDEE,
                    Commande.Statut.REJETEE
                ],
            }
        elif has_com_val:
            transitions_autorisees = {
                Commande.Statut.EN_ATTENTE: [
                    Commande.Statut.EN_COURS,
                    Commande.Statut.REJETEE
                ]
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
            raise serializers.ValidationError({
                "employe_traitant": "Employé traitant requis."
            })

        # 🔧 CORRECTIF ÉTAPE 3 : application des décisions de validation
        if validations and nouveau_statut == Commande.Statut.VALIDEE:
            for validation in validations:
                try:
                    attribution = AttributionDetailCommande.objects.get(
                        id=validation['attribution_id']
                    )
                except AttributionDetailCommande.DoesNotExist:
                    continue

                attribution.statut = validation['statut']

                if validation['statut'] == 'VALIDEE':
                    attribution.quantite_validee = validation['quantite_validee']
                    attribution.motif_refus = None
                elif validation['statut'] == 'REFUSEE':
                    attribution.quantite_validee = None
                    attribution.motif_refus = validation.get('motif_refus', '')

                attribution.save()

        # Mise à jour de la commande
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
