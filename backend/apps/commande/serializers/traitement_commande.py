from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.catalogue.models import Article
from apps.commande.access import est_gestionnaire, est_validateur
from apps.commande.models import AttributionDetailCommande, Commande, DetailCommande
from apps.commande.services import generer_sortie_stock_pour_commande
from apps.common.employees import get_request_employee
from apps.employee.models import Employer
from apps.stock.models import Magasin, UniteArticle

from .traitement_detail import DetailTraitementSerializer
from .validation_attribution import AttributionValidationSerializer

#: Transitions autorisées selon le profil.
TRANSITIONS_GESTIONNAIRE = {
    Commande.Statut.EN_COURS: (Commande.Statut.VALIDEE, Commande.Statut.REJETEE),
}
TRANSITIONS_VALIDATEUR = {
    Commande.Statut.EN_ATTENTE: (Commande.Statut.EN_COURS, Commande.Statut.REJETEE),
}


class SpecificationSerializer(serializers.Serializer):
    """Correction, par le chef hiérarchique, de la spécification d'une ligne « nouvel article »."""

    detail_id = serializers.IntegerField()
    specification = serializers.CharField(max_length=255)


class CommandeTraitementSerializer(serializers.Serializer):
    statut = serializers.ChoiceField(
        choices=[Commande.Statut.EN_COURS, Commande.Statut.VALIDEE, Commande.Statut.REJETEE]
    )
    commentaire_agent = serializers.CharField(required=False, allow_blank=True, max_length=255)
    magasin_source = serializers.PrimaryKeyRelatedField(
        queryset=Magasin.objects.all(), required=False, allow_null=True
    )
    employe_traitant = serializers.PrimaryKeyRelatedField(queryset=Employer.objects.all(), required=False)
    details = DetailTraitementSerializer(many=True, required=False, default=list)
    validations = AttributionValidationSerializer(many=True, required=False, default=list)
    specifications = SpecificationSerializer(many=True, required=False, default=list)

    # ------------------------------------------------------------------
    def _attributions_de_la_commande(self, commande, ids):
        attributions = {
            a.id: a
            for a in AttributionDetailCommande.objects.filter(
                id__in=ids, detail_commande__commande=commande
            ).select_related("detail_commande")
        }
        etrangeres = sorted(set(ids) - set(attributions))
        if etrangeres:
            raise serializers.ValidationError({
                "validations": f"L'attribution #{etrangeres[0]} n'appartient pas à cette commande."
            })
        return attributions

    def validate(self, attrs):
        commande = self.context["commande"]
        nouveau_statut = attrs["statut"]
        validations = attrs.get("validations", [])

        if nouveau_statut == Commande.Statut.VALIDEE and not attrs.get("magasin_source"):
            raise serializers.ValidationError(
                {"magasin_source": "Le magasin source est requis pour valider la commande."}
            )

        ids = [v["attribution_id"] for v in validations]
        if len(ids) != len(set(ids)):
            doublon = next(i for i in ids if ids.count(i) > 1)
            raise serializers.ValidationError({"validations": f"L'attribution #{doublon} est répétée."})
        # Toujours vérifié : auparavant, hors validation finale, on pouvait
        # modifier les attributions d'une autre commande.
        attributions = self._attributions_de_la_commande(commande, ids)
        self._attributions = attributions

        self._specifications = self._valider_specifications(commande, nouveau_statut, attrs.get("specifications", []))

        if nouveau_statut != Commande.Statut.VALIDEE:
            return attrs

        self._verifier_nouveaux_articles_rattaches(commande, validations, attributions)

        quantites_par_detail = {}
        for validation in validations:
            if validation["statut"] != "VALIDEE":
                continue
            attribution = attributions[validation["attribution_id"]]
            quantite = validation.get("quantite_validee") or Decimal(0)
            if quantite != quantite.to_integral_value():
                raise serializers.ValidationError({
                    "validations": (
                        f"La quantité validée de l'attribution #{attribution.id} doit être un nombre entier."
                    )
                })
            detail_id = attribution.detail_commande_id
            quantites_par_detail[detail_id] = quantites_par_detail.get(detail_id, 0) + int(quantite)
            if quantites_par_detail[detail_id] > attribution.detail_commande.quantite:
                raise serializers.ValidationError({
                    "validations": f"La quantité validée pour le détail #{detail_id} dépasse la quantité demandée."
                })

        self._valider_unites(commande, attrs.get("details", []), quantites_par_detail)
        return attrs

    @staticmethod
    def _valider_specifications(commande, nouveau_statut, specifications):
        """``{detail: nouvelle spécification}`` ; seulement à la pré-validation, sur les lignes
        « nouvel article » pas encore rattachées à un article."""
        if not specifications:
            return {}
        if commande.statut != Commande.Statut.EN_ATTENTE or nouveau_statut != Commande.Statut.EN_COURS:
            raise serializers.ValidationError(
                {"specifications": "La spécification ne se corrige qu'à la pré-validation de la commande."}
            )
        ids = [s["detail_id"] for s in specifications]
        details = {d.id: d for d in commande.details.filter(id__in=ids)}
        resultat = {}
        for spec in specifications:
            detail = details.get(spec["detail_id"])
            if detail is None:
                raise serializers.ValidationError(
                    {"specifications": f"La ligne #{spec['detail_id']} n'appartient pas à cette commande."}
                )
            if detail.article_id is not None or not detail.specification:
                raise serializers.ValidationError(
                    {"specifications": f"La ligne #{detail.id} n'est pas une demande de nouvel article."}
                )
            texte = spec["specification"].strip()
            if not texte:
                raise serializers.ValidationError({"specifications": "La spécification ne peut pas être vide."})
            resultat[detail] = texte
        return resultat

    @staticmethod
    def _verifier_nouveaux_articles_rattaches(commande, validations, attributions):
        """Une ligne « nouvel article » doit être rattachée à un article du catalogue pour être accordée."""
        accordees = {
            attributions[v["attribution_id"]].detail_commande_id for v in validations if v["statut"] == "VALIDEE"
        }
        for detail in commande.details.filter(article__isnull=True):
            deja_validee = detail.attributions.filter(statut="VALIDEE").exists()
            if detail.id in accordees or deja_validee:
                raise serializers.ValidationError({"details": (
                    f"« {detail.specification} » : rattachez cette demande de nouvel article à un article "
                    "du catalogue (création ou article existant) avant de valider, ou refusez-la."
                )})

    @staticmethod
    def _valider_unites(commande, details_data, quantites_par_detail):
        details = {
            d.id: d
            for d in DetailCommande.objects.filter(
                commande=commande, id__in=[d["detail_id"] for d in details_data]
            ).select_related("article")
        }
        for detail_data in details_data:
            detail = details.get(detail_data["detail_id"])
            if detail is None:
                raise serializers.ValidationError({"details": f"Détail #{detail_data['detail_id']} introuvable."})
            article = detail.article
            if article is None or not (article.is_immobilisation and article.mode_suivi == Article.ModeSuivi.NUMERO_SERIE):
                continue

            unites_ids = detail_data.get("unites_a_attribuer", [])
            attendu = quantites_par_detail.get(detail.id, 0)
            if attendu == 0:
                if unites_ids:
                    raise serializers.ValidationError({"details": (
                        f"Aucune unité n'a été validée pour '{article.designation}', "
                        "mais des unités ont été fournies."
                    )})
                continue
            if not unites_ids:
                raise serializers.ValidationError({"details": (
                    f"L'article '{article.designation}' (suivi par n° de série) nécessite "
                    f"{attendu} unité(s) à attribuer."
                )})
            if len(unites_ids) != attendu:
                raise serializers.ValidationError({"details": (
                    f"L'article '{article.designation}' nécessite exactement {attendu} unité(s) "
                    f"(quantité validée), {len(unites_ids)} fournie(s)."
                )})
            unites = list(
                UniteArticle.objects.filter(
                    unite_id__in=unites_ids, article=article, statut=UniteArticle.Statut.EN_STOCK,
                ).exclude(etat__in=[UniteArticle.Etat.PERDU, UniteArticle.Etat.HORS_USAGE])
            )
            if len(unites) != len(set(unites_ids)) or len(unites_ids) != len(set(unites_ids)):
                raise serializers.ValidationError({"details": (
                    f"Certaines unités pour '{article.designation}' n'existent pas ou ne sont pas en stock."
                )})
            sans_serie = [u.unite_id for u in unites if not u.numero_de_serie]
            if sans_serie:
                raise serializers.ValidationError({"details": (
                    f"Les unités {sans_serie} pour l'article '{article.designation}' "
                    "n'ont pas de numéro de série."
                )})

    # ------------------------------------------------------------------
    @transaction.atomic
    def save(self, **kwargs):
        request = self.context.get("request")
        # Verrou : empêche deux traitements simultanés de la même commande
        # (double sortie de stock).
        commande = Commande.objects.select_for_update().get(pk=self.context["commande"].pk)
        nouveau_statut = self.validated_data["statut"]
        statut_actuel = commande.statut

        if est_gestionnaire(request.user):
            transitions = TRANSITIONS_GESTIONNAIRE
        elif est_validateur(request.user):
            transitions = TRANSITIONS_VALIDATEUR
        else:
            transitions = {}
        if nouveau_statut not in transitions.get(statut_actuel, ()):
            raise serializers.ValidationError(
                {"statut": f"Transition non autorisée : {statut_actuel} -> {nouveau_statut}"}
            )

        traitant = self.validated_data.get("employe_traitant") or get_request_employee(request)
        if traitant is None:
            raise serializers.ValidationError({"employe_traitant": "Employé traitant requis."})

        for validation in self.validated_data.get("validations", []):
            attribution = self._attributions[validation["attribution_id"]]
            if validation["statut"] == "REFUSEE":
                attribution.statut = "REFUSEE"
                attribution.quantite_validee = None
                attribution.motif_refus = validation.get("motif_refus") or ""
            elif statut_actuel == Commande.Statut.EN_ATTENTE:
                # Pré-validation : la quantité peut être ajustée, la ligne reste en attente.
                nouvelle_quantite = validation.get("quantite_validee")
                if nouvelle_quantite:
                    attribution.quantite_demandee = nouvelle_quantite
                    attribution.quantite = nouvelle_quantite
                attribution.statut = "EN_ATTENTE"
                attribution.motif_refus = None
            else:
                attribution.statut = "VALIDEE"
                attribution.quantite_validee = validation["quantite_validee"]
                attribution.motif_refus = None
            attribution.save()

        for detail, specification in self._specifications.items():
            detail.specification = specification
            detail.save(update_fields=["specification"])

        commande.statut = nouveau_statut
        commande.commentaire_agent = self.validated_data.get("commentaire_agent", "")
        commande.employe_traitant = traitant
        commande.date_traitement = timezone.now()
        if nouveau_statut == Commande.Statut.EN_COURS:
            commande.employe_prevalidateur = traitant
            commande.date_prevalidation = commande.date_traitement
        commande.save()

        if nouveau_statut == Commande.Statut.VALIDEE:
            sortie = generer_sortie_stock_pour_commande(
                commande, self.validated_data.get("magasin_source"), self.validated_data.get("details", []),
            )
            if sortie is not None:
                sortie.realise_par = traitant
                sortie.save(update_fields=["realise_par"])
        return commande
