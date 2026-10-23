from decimal import Decimal
from functools import partial

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.catalogue.models import Article
from apps.commande.access import est_gestionnaire, est_validateur
from apps.commande.models import AttributionDetailCommande, Commande, DetailCommande
from apps.commande.services import generer_sortie_stock_pour_commande
from apps.common.employees import get_request_employee
from apps.employee.models import Employer
from apps.notifications.tasks import notifier_livraison_partielle
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

        livraison = any(v["statut"] == "VALIDEE" for v in validations)
        if nouveau_statut == Commande.Statut.VALIDEE and livraison and not attrs.get("magasin_source"):
            raise serializers.ValidationError(
                {"magasin_source": "Le magasin source est requis pour la sortie de stock."}
            )

        ids = [v["attribution_id"] for v in validations]
        if len(ids) != len(set(ids)):
            doublon = next(i for i in ids if ids.count(i) > 1)
            raise serializers.ValidationError({"validations": f"L'attribution #{doublon} est répétée."})
        # Toujours vérifié : auparavant, hors validation finale, on pouvait
        # modifier les attributions d'une autre commande.
        attributions = self._attributions_de_la_commande(commande, ids)
        self._attributions = attributions
        self._verifier_decisions(commande, nouveau_statut, validations, attributions)

        self._specifications = self._valider_specifications(commande, nouveau_statut, attrs.get("specifications", []))

        if nouveau_statut != Commande.Statut.VALIDEE:
            return attrs

        self._verifier_nouveaux_articles_rattaches(commande, validations, attributions)

        # Quantités livrées maintenant, par ligne (les unités suivies par n° de série en dépendent).
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
            if quantite > attribution.quantite_demandee:
                raise serializers.ValidationError({
                    "validations": (
                        f"La quantité livrée ({int(quantite)}) dépasse la quantité demandée "
                        f"({int(attribution.quantite_demandee)}) pour {attribution.affectation.nom}."
                    )
                })
            detail_id = attribution.detail_commande_id
            quantites_par_detail[detail_id] = quantites_par_detail.get(detail_id, 0) + int(quantite)

        self._valider_unites(commande, attrs.get("details", []), quantites_par_detail)
        return attrs

    @staticmethod
    def _verifier_decisions(commande, nouveau_statut, validations, attributions):
        """Seules les attributions encore en attente se décident : une ligne refusée (par exemple à la
        pré-validation) ou déjà livrée ne revient pas dans le traitement. « En attente d'achat » n'a de
        sens qu'à la validation finale."""
        if nouveau_statut == Commande.Statut.REJETEE:
            return
        for validation in validations:
            attribution = attributions[validation["attribution_id"]]
            if attribution.statut != "EN_ATTENTE":
                etat = "refusée" if attribution.statut == "REFUSEE" else "déjà livrée"
                raise serializers.ValidationError({
                    "validations": f"L'attribution #{attribution.id} ({attribution.affectation.nom}) est {etat}."
                })
            if validation["statut"] == "EN_ATTENTE" and commande.statut != Commande.Statut.EN_COURS:
                raise serializers.ValidationError({
                    "validations": "« En attente d'achat » ne se choisit qu'à la validation finale."
                })

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
    @staticmethod
    def _livrer(attribution, validation):
        """Livraison (validation finale) : si une partie seulement est livrée, la ligne est scindée ;
        le reste devient une nouvelle attribution « en attente d'achat » ou « non accordée »."""
        livree = validation["quantite_validee"]
        reste = attribution.quantite_demandee - livree
        if reste > 0:
            refuse = validation.get("reste") == "REFUSEE"
            AttributionDetailCommande.objects.create(
                detail_commande=attribution.detail_commande, affectation=attribution.affectation,
                quantite=reste, quantite_demandee=reste,
                statut="REFUSEE" if refuse else "EN_ATTENTE",
                motif_refus=(validation.get("motif_reste") or "Quantité non accordée") if refuse else None,
            )
            attribution.quantite = livree
            attribution.quantite_demandee = livree
        attribution.statut = "VALIDEE"
        attribution.quantite_validee = livree
        attribution.motif_refus = None

    def _statut_final(self, commande, statut_actuel, nouveau_statut, livrees):
        """Statut de la commande après le traitement.

        - Pré-validation : tout refusé -> REJETEE (plus rien à transmettre au gestionnaire).
        - Validation finale : reste-t-il des lignes en attente d'achat ? -> EN_COURS (livrée en partie) ;
          sinon VALIDEE si quelque chose a été livré, REJETEE sinon.
        - Rejet d'une commande déjà livrée en partie : seul le reste est refusé, elle est VALIDEE (clôturée).
        """
        attributions = AttributionDetailCommande.objects.filter(detail_commande__commande=commande)
        if statut_actuel == Commande.Statut.EN_ATTENTE:
            if nouveau_statut == Commande.Statut.EN_COURS and attributions.exists() \
                    and not attributions.exclude(statut="REFUSEE").exists():
                return Commande.Statut.REJETEE
            return nouveau_statut

        deja_livree = attributions.filter(statut="VALIDEE").exists()
        if nouveau_statut == Commande.Statut.REJETEE:
            if not deja_livree:
                return Commande.Statut.REJETEE
            motif = self.validated_data.get("commentaire_agent") or "Non livré : commande clôturée"
            attributions.filter(statut="EN_ATTENTE").update(statut="REFUSEE", motif_refus=motif[:255])
            return Commande.Statut.VALIDEE

        decisions = self.validated_data.get("validations", [])
        if not any(v["statut"] in ("VALIDEE", "REFUSEE") for v in decisions):
            raise serializers.ValidationError(
                {"validations": "Aucune livraison ni refus : rien à enregistrer."}
            )
        if attributions.filter(statut="EN_ATTENTE").exists():
            return Commande.Statut.EN_COURS
        return Commande.Statut.VALIDEE if deja_livree else Commande.Statut.REJETEE

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

        livrees = []
        for validation in self.validated_data.get("validations", []):
            attribution = self._attributions[validation["attribution_id"]]
            if validation["statut"] == "REFUSEE":
                attribution.statut = "REFUSEE"
                attribution.quantite_validee = None
                attribution.motif_refus = validation.get("motif_refus") or ""
            elif validation["statut"] == "EN_ATTENTE":
                continue  # en attente d'achat : rien ne change, la ligne reste à traiter
            elif statut_actuel == Commande.Statut.EN_ATTENTE:
                # Pré-validation : la quantité peut être ajustée, la ligne reste en attente.
                nouvelle_quantite = validation.get("quantite_validee")
                if nouvelle_quantite:
                    attribution.quantite_demandee = nouvelle_quantite
                    attribution.quantite = nouvelle_quantite
                attribution.statut = "EN_ATTENTE"
                attribution.motif_refus = None
            else:
                self._livrer(attribution, validation)
                livrees.append(attribution.pk)
            attribution.save()

        for detail, specification in self._specifications.items():
            detail.specification = specification
            detail.save(update_fields=["specification"])

        statut_final = self._statut_final(commande, statut_actuel, nouveau_statut, livrees)
        commande.statut = statut_final
        commande.commentaire_agent = self.validated_data.get("commentaire_agent", "")
        commande.employe_traitant = traitant
        commande.date_traitement = timezone.now()
        if statut_actuel == Commande.Statut.EN_ATTENTE and nouveau_statut == Commande.Statut.EN_COURS:
            commande.employe_prevalidateur = traitant
            commande.date_prevalidation = commande.date_traitement
        commande.save()

        if livrees:
            sortie = generer_sortie_stock_pour_commande(
                commande, self.validated_data.get("magasin_source"), self.validated_data.get("details", []),
                attributions_ids=livrees,
            )
            if sortie is not None:
                sortie.realise_par = traitant
                sortie.save(update_fields=["realise_par"])
                if statut_final == Commande.Statut.EN_COURS:
                    # Livraison partielle : pas de changement de statut, donc pas de notification
                    # automatique ; le demandeur est prévenu qu'il peut récupérer ce qui est livré.
                    transaction.on_commit(partial(notifier_livraison_partielle.delay, commande.pk, sortie.pk))
        return commande
