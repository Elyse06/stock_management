from datetime import timedelta

from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST, HTTP_404_NOT_FOUND
from rest_framework.views import APIView

from apps.catalogue.models import Article
from apps.common.dates import debut_de_journee, parse_date_param
from apps.common.localisation import filtre_direction, filtre_salle, filtre_site
from apps.common.params import un_seul_renseigne
from apps.common.stock import stocks_articles_beneficiaire, stocks_articles_magasin
from apps.employee.models import Direction, Site
from apps.stock.models import Magasin, Salle

from .permissions import HistoriquePermission

LIEUX = {
    "magasin_id": (Magasin, None, "Magasin non trouvé."),
    "direction_id": (Direction, filtre_direction, "Direction non trouvée."),
    "site_id": (Site, filtre_site, "Site non trouvé."),
    "salle_id": (Salle, filtre_salle, "Salle non trouvée."),
}


class HistoriqueLocalisationView(APIView):
    permission_classes = [HistoriquePermission]  # noqa: RUF012

    def get(self, request):
        params = request.query_params
        if not params.get("date"):
            return Response({"error": "Le paramètre 'date' est obligatoire."}, status=HTTP_400_BAD_REQUEST)
        try:
            jour = parse_date_param(params.get("date"), "date")
        except Exception:  # noqa: BLE001
            return Response(
                {"error": "Le paramètre 'date' doit être au format AAAA-MM-JJ."}, status=HTTP_400_BAD_REQUEST
            )

        choix = un_seul_renseigne(**{nom: params.get(nom) for nom in LIEUX})
        if choix is None:
            return Response(
                {"error": "Sélectionnez un magasin, une direction, un site ou une salle."},
                status=HTTP_400_BAD_REQUEST,
            )
        nom, valeur = choix
        modele, filtre, introuvable = LIEUX[nom]
        try:
            lieu = modele.objects.filter(pk=valeur).first()
        except (TypeError, ValueError):
            return Response({"error": f"Identifiant invalide pour '{nom}'."}, status=HTTP_400_BAD_REQUEST)
        if lieu is None:
            return Response({"error": introuvable}, status=HTTP_404_NOT_FOUND)

        # Mouvements jusqu'à la fin de la journée demandée incluse.
        date_max = debut_de_journee(jour + timedelta(days=1))
        if filtre is None:
            stocks = stocks_articles_magasin(lieu.pk, date_max=date_max)
        else:
            stocks = stocks_articles_beneficiaire(filtre(lieu.pk), date_max=date_max)

        positifs = {code: stock for code, stock in stocks.items() if stock > 0}
        articles = Article.objects.filter(code_article__in=positifs).order_by("code_article")
        return Response([
            {"article_code": a.code_article, "article_designation": a.designation, "stock": positifs[a.code_article]}
            for a in articles
        ])
