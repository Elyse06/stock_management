"""Demandes de retour ou de transfert d'unités, et liste « Mes équipements » du demandeur."""
from django.db.models import Case, IntegerField, Q, When
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.catalogue.models import Article
from apps.common import actions
from apps.common.employees import get_request_employee
from apps.common.pagination import paginer
from apps.common.params import filtre_type_article
from apps.common.pdf import reponse_pdf
from apps.common.permissions import HasAction, user_has_any_action
from apps.common.stock import fournitures_detenues
from apps.stock.fiche_demande_pdf import generer_fiche_demande
from apps.stock.fiche_mouvement_pdf import generer_document_mouvement, nom_fichier_mouvement
from apps.stock.models import Affectation, DemandeUnite
from apps.stock.serializers import UniteArticleSerializer
from apps.stock.serializers.demande_unite import CreationDemandeUniteSerializer, DemandeUniteSerializer
from apps.stock.services.demandes_unites import (
    annuler_demande,
    condition_beneficiaires,
    creer_demande,
    refuser_demande,
    unites_visibles,
)

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
        """Demande traitée : accusé de retour ou de transfert du mouvement effectué ; sinon, fiche de la
        demande (gestionnaire du stock uniquement)."""
        demande = self.get_object()
        if demande.statut == DemandeUnite.Statut.TRAITEE and demande.mouvement_id:
            mouvement = demande.mouvement
            return reponse_pdf(generer_document_mouvement(mouvement), nom_fichier_mouvement(mouvement))
        return reponse_pdf(generer_fiche_demande(demande), f"demande_{demande.pk}.pdf")

    @action(detail=False, methods=["get"])
    def compteur(self, request):
        return Response({"en_attente": DemandeUnite.objects.filter(statut=DemandeUnite.Statut.EN_ATTENTE).count()})

    @action(detail=False, methods=["get"], url_path="mes-unites")
    def mes_unites(self, request):
        """Matériel attribué à l'employé connecté ou à sa direction (et, pour le chef hiérarchique, à chaque
        employé de sa direction) : une ligne par unité d'immobilisation (avec sa demande en attente) et une
        ligne par fourniture et par bénéficiaire (quantité détenue ; pas de demande de retour ni de transfert)."""
        employe = get_request_employee(request)
        chef = user_has_any_action(request.user, actions.COM_VAL)
        type_article = filtre_type_article(request.query_params, "is_immobilisation").get("is_immobilisation")
        recherche = request.query_params.get("search", "").strip().lower()

        lignes = []
        if type_article is not False:
            unites = unites_visibles(employe, toute_la_direction=chef).select_related(
                "article__categorie", "affectation__employe", "affectation__direction",
            )
            if recherche:
                unites = unites.filter(Q(article__designation__icontains=recherche) | Q(numero_de_serie__icontains=recherche))
            lignes += [("U", unite) for unite in unites]
        condition = condition_beneficiaires(employe, toute_la_direction=chef)
        if type_article is not True and condition is not None:
            fournitures = fournitures_detenues(condition)
            articles = Article.objects.select_related("categorie").in_bulk({f["article"] for f in fournitures})
            affectations = Affectation.objects.select_related("employe", "direction").in_bulk({f["affectation"] for f in fournitures})
            for fourniture in fournitures:
                article = articles[fourniture["article"]]
                if recherche and recherche not in f"{article.designation} {article.code_article}".lower():
                    continue
                lignes.append(("F", {**fourniture, "article": article, "affectation": affectations[fourniture["affectation"]]}))

        moi = getattr(employe, "pk", None)

        def affectation_de(ligne):
            return ligne[1].affectation if ligne[0] == "U" else ligne[1]["affectation"]

        def article_de(ligne):
            return ligne[1].article if ligne[0] == "U" else ligne[1]["article"]

        # Ses propres équipements d'abord, puis ceux de la direction et des collègues ; par article.
        lignes.sort(key=lambda ligne: (affectation_de(ligne).employe_id != moi, affectation_de(ligne).beneficiaire_type,
                                       affectation_de(ligne).nom.lower(), not article_de(ligne).is_immobilisation,
                                       article_de(ligne).designation.lower(), getattr(ligne[1], "unite_id", 0)))
        page = paginer(lignes, request)
        unites_page = [objet.unite_id for genre, objet in page["results"] if genre == "U"]
        en_attente = {
            d.unite_id: d for d in DemandeUnite.objects.select_related("demandeur").filter(
                unite_id__in=unites_page, statut=DemandeUnite.Statut.EN_ATTENTE)
        }
        resultats = []
        for genre, objet in page["results"]:
            if genre == "U":
                donnees = UniteArticleSerializer(objet).data
                demande = en_attente.get(objet.unite_id)
                donnees.update({
                    "ligne_id": f"U-{objet.unite_id}", "fourniture": False, "quantite": 1, "is_immobilisation": True,
                    "a_moi": objet.affectation.employe_id == moi,
                    "demande_en_attente": demande and {
                        "demande_id": demande.pk, "type_demande": demande.type_demande,
                        "type_label": demande.get_type_demande_display(),
                        "demandeur_nom": demande.demandeur.emp_nom if demande.demandeur else "",
                        "de_moi": demande.demandeur_id == moi,
                    },
                })
            else:
                article, affectation = objet["article"], objet["affectation"]
                donnees = {
                    "ligne_id": f"F-{affectation.pk}-{article.pk}", "fourniture": True, "unite_id": None,
                    "article_code": article.code_article, "article_designation": article.designation,
                    "article_categorie": article.categorie.cat_libelle if article.categorie_id else None,
                    "is_immobilisation": False, "quantite": objet["quantite"], "numero_de_serie": None, "etat": None,
                    "beneficiaire_type": affectation.beneficiaire_type, "employe_attribue_nom": affectation.nom,
                    "date_attribution": objet["derniere_reception"], "a_moi": affectation.employe_id == moi,
                    "demande_en_attente": None,
                }
            resultats.append(donnees)
        page["results"] = resultats
        page["employe_rattache"] = employe is not None
        page["peut_demander"] = chef  # seul le chef hiérarchique fait les demandes (immobilisations seulement)
        return Response(page)
