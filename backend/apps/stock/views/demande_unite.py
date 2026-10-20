"""Demandes de retour ou de transfert d'unités, et liste « Mes équipements » du demandeur."""
from django.db.models import Case, IntegerField, Q, When
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.common import actions
from apps.common.employees import get_request_employee
from apps.common.pagination import paginer
from apps.common.params import filtre_type_article
from apps.common.pdf import reponse_pdf
from apps.common.permissions import HasAction, user_has_any_action
from apps.stock.fiche_demande_pdf import generer_fiche_demande
from apps.stock.models import DemandeUnite
from apps.stock.serializers import UniteArticleSerializer
from apps.stock.serializers.demande_unite import CreationDemandeUniteSerializer, DemandeUniteSerializer
from apps.stock.services.demandes_unites import annuler_demande, creer_demande, refuser_demande, unites_visibles

DEMANDEUR = HasAction.for_actions(actions.COM_DEM)
# Les demandes de retour ou de transfert sont faites par le chef hiérarchique, pour toute sa direction.
CHEF = HasAction.for_actions(actions.COM_VAL)
GESTIONNAIRE = HasAction.for_actions(actions.INV_GERE)


class DemandeUniteViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    """Le gestionnaire (INV_GERE) voit toutes les demandes ; un employé, les siennes (ou ?mes=1)."""

    serializer_class = DemandeUniteSerializer
    filter_backends = [filters.SearchFilter]  # noqa: RUF012
    search_fields = ["unite__article__designation", "unite__numero_de_serie", "demandeur__emp_nom"]  # noqa: RUF012

    def get_permissions(self):
        regles = {"create": CHEF, "annuler": CHEF, "mes_unites": DEMANDEUR,
                  "refuser": GESTIONNAIRE, "compteur": GESTIONNAIRE, "pdf": GESTIONNAIRE}
        return [regles.get(self.action, HasAction.for_actions(actions.COM_DEM, actions.INV_GERE))()]

    def get_queryset(self):
        demandes = DemandeUnite.objects.select_related(
            "unite__article", "demandeur", "traitant",
            *(f"{champ}__{cible}" for champ in ("affectation_origine", "nouvelle_affectation")
              for cible in ("employe", "direction", "salle", "site")),
        )
        if self.request.query_params.get("mes") == "1" or not user_has_any_action(self.request.user, actions.INV_GERE):
            demandes = demandes.filter(demandeur=get_request_employee(self.request))
        for parametre, champ in (("statut", "statut"), ("type_demande", "type_demande")):
            if valeur := self.request.query_params.get(parametre):
                demandes = demandes.filter(**{champ: valeur})
        demandes = demandes.filter(**filtre_type_article(self.request.query_params, "unite__article__is_immobilisation"))
        # Demandes en attente d'abord (à traiter), puis les autres, de la plus récente à la plus ancienne :
        # une demande traitée reste dans la liste, avec sa fiche PDF.
        return demandes.annotate(
            priorite=Case(When(statut=DemandeUnite.Statut.EN_ATTENTE, then=0), default=1, output_field=IntegerField()),
        ).order_by("priorite", "-date_demande", "-demande_id")

    def create(self, request, *args, **kwargs):
        employe = get_request_employee(request)
        if employe is None:
            raise ValidationError({"detail": "Votre compte n'est rattaché à aucun employé."})
        donnees = CreationDemandeUniteSerializer(data=request.data)
        donnees.is_valid(raise_exception=True)
        v = donnees.validated_data
        demande = creer_demande(employe, v["unite_id"], v["type_demande"], v["motif"], v["nouveau_beneficiaire"])
        return Response(DemandeUniteSerializer(self.get_queryset().get(pk=demande.pk)).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def annuler(self, request, pk=None):
        annuler_demande(pk, get_request_employee(request))
        return Response(DemandeUniteSerializer(DemandeUnite.objects.get(pk=pk)).data)

    @action(detail=True, methods=["post"])
    def refuser(self, request, pk=None):
        commentaire = str(request.data.get("commentaire", "")).strip()
        if not commentaire:
            raise ValidationError({"commentaire": "Indiquez le motif du refus."})
        refuser_demande(pk, get_request_employee(request), commentaire)
        return Response(DemandeUniteSerializer(DemandeUnite.objects.get(pk=pk)).data)

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        """Fiche PDF de la demande (gestionnaire du stock uniquement)."""
        demande = self.get_object()
        return reponse_pdf(generer_fiche_demande(demande), f"demande_{demande.pk}.pdf")

    @action(detail=False, methods=["get"])
    def compteur(self, request):
        return Response({"en_attente": DemandeUnite.objects.filter(statut=DemandeUnite.Statut.EN_ATTENTE).count()})

    @action(detail=False, methods=["get"], url_path="mes-unites")
    def mes_unites(self, request):
        """Unités attribuées à l'employé connecté ou à sa direction (et, pour le chef hiérarchique, à chaque
        employé de sa direction), avec leur demande en attente."""
        employe = get_request_employee(request)
        chef = user_has_any_action(request.user, actions.COM_VAL)
        unites = unites_visibles(employe, toute_la_direction=chef).select_related(
            "article__categorie", "affectation__employe", "affectation__direction",
        ).order_by("affectation__beneficiaire_type", "article__designation", "unite_id")
        unites = unites.filter(**filtre_type_article(request.query_params, "article__is_immobilisation"))
        if recherche := request.query_params.get("search", "").strip():
            unites = unites.filter(Q(article__designation__icontains=recherche) | Q(numero_de_serie__icontains=recherche))
        page = paginer(unites, request)
        en_attente = {
            d.unite_id: d for d in DemandeUnite.objects.select_related("demandeur").filter(
                unite_id__in=[u.unite_id for u in page["results"]], statut=DemandeUnite.Statut.EN_ATTENTE)
        }
        resultats = []
        for unite in page["results"]:
            donnees = UniteArticleSerializer(unite).data
            demande = en_attente.get(unite.unite_id)
            donnees["a_moi"] = unite.affectation.employe_id == getattr(employe, "pk", None)
            donnees["demande_en_attente"] = demande and {
                "demande_id": demande.pk, "type_demande": demande.type_demande, "type_label": demande.get_type_demande_display(),
                "demandeur_nom": demande.demandeur.emp_nom if demande.demandeur else "", "de_moi": demande.demandeur_id == getattr(employe, "pk", None),
            }
            resultats.append(donnees)
        page["results"] = resultats
        page["employe_rattache"] = employe is not None
        page["peut_demander"] = chef  # seul le chef hiérarchique fait les demandes
        return Response(page)
