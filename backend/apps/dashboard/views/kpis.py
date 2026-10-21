"""Indicateurs clés et listes détaillées associées."""
from datetime import timedelta

from django.db.models import Case, F, IntegerField, Max, Q, Sum, Value, When
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalogue.models import Article
from apps.common.dates import ajouter_mois, plage_mois
from apps.common.pagination import paginer
from apps.common.params import filtre_type_article
from apps.common.pdf import reponse_pdf
from apps.common.stock import annoter_stock
from apps.stock.models import DetailMouvement, Mouvement

from ..rapport_pdf import LIGNES_MAX, generer_rapport
from .permissions import DashboardPermission

JOURS_DORMANT = 90

# « Entrées et retours du mois » : un transfert déplace du stock entre magasins
# sans en ajouter au total ; il n'est donc pas compté (il l'était auparavant).
FILTRE_ENTREES = Q(mouvement__type_mouvement__in=(Mouvement.Type.ENTREE, Mouvement.Type.RETOUR))


def _total(queryset):
    return queryset.aggregate(total=Coalesce(Sum("quantite"), 0))["total"]


def _compter(condition):
    return Coalesce(Sum(Case(When(condition, then=Value(1)), default=Value(0), output_field=IntegerField())), 0)


class DashboardKPIsView(APIView):
    permission_classes = [DashboardPermission]  # noqa: RUF012

    def get(self, request):
        debut_mois, _, libelle = plage_mois()
        annee, mois = (int(x) for x in libelle.split("-"))
        debut_precedent, _, _ = plage_mois("{:04d}-{:02d}".format(*ajouter_mois(annee, mois, -1)))
        # Total, ruptures et sous-seuil en une seule requête sur les stocks annotés.
        indicateurs = annoter_stock(Article.objects.all()).aggregate(
            total_articles=Coalesce(Sum(Value(1)), 0),
            total_stock=Coalesce(Sum("stock_calcule"), 0),
            produits_en_rupture=_compter(Q(stock_calcule=0)),
            produits_sous_seuil=_compter(Q(stock_calcule__lt=F("seuil"))),
        )
        return Response({
            **indicateurs,
            "entrees_du_mois": _total(DetailMouvement.objects.filter(FILTRE_ENTREES, mouvement__date__gte=debut_mois)),
            "sorties_du_mois": _total(DetailMouvement.objects.filter(
                mouvement__type_mouvement=Mouvement.Type.SORTIE, mouvement__date__gte=debut_mois
            )),
            # Mois précédent complet : sert à afficher l'évolution (« +35 % ») sur les cartes.
            "entrees_mois_precedent": _total(DetailMouvement.objects.filter(
                FILTRE_ENTREES, mouvement__date__gte=debut_precedent, mouvement__date__lt=debut_mois
            )),
            "sorties_mois_precedent": _total(DetailMouvement.objects.filter(
                mouvement__type_mouvement=Mouvement.Type.SORTIE,
                mouvement__date__gte=debut_precedent, mouvement__date__lt=debut_mois,
            )),
        })


def _reponse_paginee(paginated, data, **extra):
    return Response({
        "count": paginated["count"],
        "next": paginated["next"],
        "previous": paginated["previous"],
        **extra,
        "results": data,
    })


LIBELLES_TYPE = {True: "Immobilisations", False: "Fournitures"}
MOIS = ("janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre")


def _mois_en_clair(valeur):
    """« 2026-10 » -> « octobre 2026 » (valeur laissée telle quelle si elle n'a pas ce format)."""
    try:
        annee, mois = (int(x) for x in str(valeur).split("-"))
        return f"{MOIS[mois - 1]} {annee}"
    except (ValueError, IndexError):
        return str(valeur)


class _DetailIndicateurView(APIView):
    """Liste détaillée d'un indicateur : page JSON, ou rapport PDF complet avec ``?export=pdf``.

    Chaque vue fournit ``donnees(request) -> (queryset trié, ligne(objet) -> dict, informations)``
    et décrit les colonnes du rapport : ``COLONNES = [(clé, libellé, largeur en cm), ...]``.
    """

    permission_classes = [DashboardPermission]  # noqa: RUF012
    TITRE = ""
    COLONNES = ()

    def donnees(self, request):
        raise NotImplementedError

    def get(self, request):
        queryset, ligne, informations = self.donnees(request)
        if request.query_params.get("export") == "pdf":
            return self._pdf(request, queryset, ligne, informations)
        paginated = paginer(queryset, request)
        return _reponse_paginee(paginated, [ligne(o) for o in paginated["results"]], **informations)

    def _pdf(self, request, queryset, ligne, informations):
        params = request.query_params
        filtres = [("Type d'article", LIBELLES_TYPE.get(next(iter(filtre_type_article(params).values()), None), "Tous"))]
        if params.get("search"):
            filtres.append(("Recherche", params["search"]))
        if informations.get("mois"):
            filtres.append(("Mois", _mois_en_clair(informations["mois"])))
        total = queryset.count()
        lignes = [ligne(o) for o in queryset[:LIGNES_MAX]]
        contenu = generer_rapport(self.TITRE, filtres, self.COLONNES, lignes, total,
                                  total_quantite=informations.get("total_quantite"))
        return reponse_pdf(contenu, f"rapport_{self.NOM_FICHIER}.pdf")


class DashboardArticlesView(_DetailIndicateurView):
    TITRE, NOM_FICHIER = "Liste des articles", "articles"
    COLONNES = (("code_article", "Code", 2.6), ("designation", "Désignation", 6), ("type", "Type", 2.6),
                ("categorie_nom", "Catégorie", 3.6), ("stock_calcule", "Stock", 2.6))

    def donnees(self, request):
        params = request.query_params
        queryset = annoter_stock(Article.objects.select_related("categorie").filter(**filtre_type_article(params)))
        if params.get("search"):
            queryset = queryset.filter(
                Q(code_article__icontains=params["search"]) | Q(designation__icontains=params["search"])
            )
        if params.get("categorie"):
            queryset = queryset.filter(categorie_id=params["categorie"])
        if params.get("mode_suivi"):
            queryset = queryset.filter(mode_suivi=params["mode_suivi"])

        def ligne(a):
            return {
                "code_article": a.code_article,
                "designation": a.designation,
                "categorie_nom": a.categorie.cat_libelle if a.categorie else None,
                "is_immobilisation": a.is_immobilisation,
                "type": LIBELLES_TYPE[a.is_immobilisation],
                "stock_calcule": a.stock_calcule,
                "seuil": a.seuil,
                "mode_suivi": a.mode_suivi,
            }
        return queryset.order_by("-stock_calcule", "code_article"), ligne, {}


class DashboardRupturesView(_DetailIndicateurView):
    TITRE, NOM_FICHIER = "Produits en rupture de stock", "ruptures"
    COLONNES = (("code_article", "Code", 2.6), ("designation", "Désignation", 6), ("type", "Type", 2.6),
                ("categorie_nom", "Catégorie", 2.8), ("dernier_mouvement_texte", "Dernier mouvement", 3.4))

    def donnees(self, request):
        queryset = (
            annoter_stock(Article.objects.select_related("categorie").filter(**filtre_type_article(request.query_params)))
            .annotate(dernier_mouvement=Max("details_mouvement__mouvement__date"))
            .filter(stock_calcule=0)
            .order_by("code_article")
        )
        limite_dormant = timezone.now() - timedelta(days=JOURS_DORMANT)

        def ligne(a):
            return {
                "code_article": a.code_article,
                "designation": a.designation,
                "categorie_nom": a.categorie.cat_libelle if a.categorie else None,
                "is_immobilisation": a.is_immobilisation,
                "type": LIBELLES_TYPE[a.is_immobilisation],
                "seuil": a.seuil,
                "dernier_mouvement": a.dernier_mouvement,
                "dernier_mouvement_texte": timezone.localtime(a.dernier_mouvement).strftime("%d/%m/%Y") if a.dernier_mouvement else "Jamais",
                "est_dormant": a.dernier_mouvement is None or a.dernier_mouvement < limite_dormant,
            }
        return queryset, ligne, {}


class DashboardSousSeuilView(_DetailIndicateurView):
    TITRE, NOM_FICHIER = "Produits sous le seuil", "sous_seuil"
    COLONNES = (("code_article", "Code", 2.4), ("designation", "Désignation", 5.2), ("type", "Type", 2.4),
                ("stock_calcule", "Stock", 1.6), ("seuil", "Seuil", 1.6), ("quantite_suggeree", "Qté suggérée", 2.2),
                ("urgence", "Urgence", 2))
    URGENCES = {"critique": "Critique", "urgent": "Urgent", "attention": "Attention"}

    @staticmethod
    def _urgence(stock, seuil):
        if stock == 0:
            return "critique"
        return "urgent" if stock < seuil * 0.5 else "attention"

    def donnees(self, request):
        queryset = (
            annoter_stock(Article.objects.select_related("categorie").filter(**filtre_type_article(request.query_params)))
            .filter(stock_calcule__lt=F("seuil"), seuil__gt=0)
            .order_by("stock_calcule", "code_article")
        )

        def ligne(a):
            urgence = self._urgence(a.stock_calcule, a.seuil)
            return {
                "code_article": a.code_article,
                "designation": a.designation,
                "categorie_nom": a.categorie.cat_libelle if a.categorie else None,
                "is_immobilisation": a.is_immobilisation,
                "type": LIBELLES_TYPE[a.is_immobilisation],
                "stock_calcule": a.stock_calcule,
                "seuil": a.seuil,
                "quantite_suggeree": max(0, a.seuil * 2 - a.stock_calcule),
                "niveau_urgence": urgence,
                "urgence": self.URGENCES[urgence],
            }
        return queryset, ligne, {}


class _MouvementsDuMoisView(_DetailIndicateurView):
    def filtre(self):
        raise NotImplementedError

    def ligne(self, detail):
        raise NotImplementedError

    def donnees(self, request):
        debut, fin, libelle = plage_mois(request.query_params.get("mois"))
        queryset = DetailMouvement.objects.filter(
            self.filtre(), mouvement__date__gte=debut, mouvement__date__lt=fin,
            **filtre_type_article(request.query_params, "article__is_immobilisation"),
        ).select_related(
            "article", "mouvement__magasin_source", "mouvement__magasin_destination",
            "affectation__employe", "affectation__direction", "affectation__salle", "affectation__site",
        )
        total = _total(queryset)
        return queryset.order_by("-mouvement__date", "-pk"), self.ligne, {"total_quantite": total, "mois": libelle}

    @staticmethod
    def _commun(detail):
        mouvement = detail.mouvement
        return {
            "mouvement_id": mouvement.mouvement_id,
            "date": mouvement.date,
            "date_texte": timezone.localtime(mouvement.date).strftime("%d/%m/%Y"),
            "article_code": detail.article.code_article,
            "article_designation": detail.article.designation,
            "is_immobilisation": detail.article.is_immobilisation,
            "type": LIBELLES_TYPE[detail.article.is_immobilisation],
            "quantite": detail.quantite,
        }


class DashboardEntreesMoisView(_MouvementsDuMoisView):
    TITRE, NOM_FICHIER = "Entrées et retours du mois", "entrees"
    COLONNES = (("date_texte", "Date", 2.5), ("article_code", "Code", 2.4), ("article_designation", "Désignation", 4.3),
                ("type", "Type", 2.4), ("quantite", "Quantité", 2), ("magasin_destination", "Magasin", 3.8))

    def filtre(self):
        return FILTRE_ENTREES

    def ligne(self, detail):
        destination = detail.mouvement.magasin_destination
        return {
            **self._commun(detail),
            "magasin_destination": destination.magasin_nom if destination else None,
            "origine": detail.mouvement.origine,
            "motif": detail.mouvement.motif,
        }


class DashboardSortiesMoisView(_MouvementsDuMoisView):
    TITRE, NOM_FICHIER = "Sorties du mois", "sorties"
    COLONNES = (("date_texte", "Date", 2.5), ("article_code", "Code", 2.4), ("article_designation", "Désignation", 4.3),
                ("type", "Type", 2.4), ("quantite", "Quantité", 2), ("beneficiaire", "Bénéficiaire", 3.8))

    def filtre(self):
        return Q(mouvement__type_mouvement=Mouvement.Type.SORTIE)

    def ligne(self, detail):
        source = detail.mouvement.magasin_source
        return {
            **self._commun(detail),
            "magasin_source": source.magasin_nom if source else None,
            "beneficiaire": detail.affectation.nom if detail.affectation_id else None,
            "origine": detail.mouvement.origine,
            "motif": detail.mouvement.motif,
        }
