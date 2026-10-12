from django.db.models import Q, prefetch_related_objects
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.dates import parse_date_param
from apps.common.pagination import paginer
from apps.common.params import parse_int
from apps.stock.models import Mouvement

from .permissions import HistoriquePermission


def _detail(detail):
    affectation = detail.affectation if detail.affectation_id else None
    return {
        "id": detail.pk,
        "article_code": detail.article.code_article,
        "article_designation": detail.article.designation,
        "quantite": detail.quantite,
        "employe_beneficiaire": affectation.employe_id if affectation else None,
        "employe_beneficiaire_nom": detail.employe_beneficiaire_nom,
        "employe_beneficiaire_matricule": detail.employe_beneficiaire_matricule,
        "employe_beneficiaire_fonction": detail.employe_beneficiaire_fonction,
        "direction_beneficiaire": affectation.direction_id if affectation else None,
        "direction_beneficiaire_nom": affectation.direction.dir_libelle if affectation and affectation.direction_id else None,
        "salle_beneficiaire": affectation.salle_id if affectation else None,
        "salle_beneficiaire_nom": affectation.salle.nom if affectation and affectation.salle_id else None,
        "site_beneficiaire": affectation.site_id if affectation else None,
        "site_beneficiaire_nom": affectation.site.site_nom if affectation and affectation.site_id else None,
        "beneficiaire_type": detail.beneficiaire_type,
        "beneficiaire_nom": affectation.nom if affectation else None,
    }


def _magasin(magasin):
    return {"magasin_id": magasin.magasin_id, "magasin_nom": magasin.magasin_nom} if magasin else None


class HistoriqueGlobaleView(APIView):
    permission_classes = [HistoriquePermission]  # noqa: RUF012

    def get(self, request):
        params = request.query_params
        date_debut = parse_date_param(params.get("date_debut"), "date_debut")
        date_fin = parse_date_param(params.get("date_fin"), "date_fin")
        magasin_id = parse_int(params.get("magasin_id"), minimum=1)

        mouvements = Mouvement.objects.select_related("magasin_source", "magasin_destination").order_by(
            "-date", "-mouvement_id"
        )
        if date_debut:
            mouvements = mouvements.filter(date__date__gte=date_debut)
        if date_fin:
            mouvements = mouvements.filter(date__date__lte=date_fin)
        if magasin_id:
            mouvements = mouvements.filter(Q(magasin_source_id=magasin_id) | Q(magasin_destination_id=magasin_id))
        if params.get("type_mouvement"):
            mouvements = mouvements.filter(type_mouvement=params["type_mouvement"])
        if params.get("article_designation"):
            mouvements = mouvements.filter(
                details__article__designation__icontains=params["article_designation"]
            ).distinct()

        page = paginer(mouvements, request, page_size=25)
        prefetch_related_objects(
            page["results"],
            "details__article", "details__affectation__employe", "details__affectation__direction",
            "details__affectation__salle", "details__affectation__site",
        )
        page["results"] = [
            {
                "mouvement_id": m.mouvement_id,
                "date": m.date,
                "type_mouvement": m.type_mouvement,
                "origine": m.origine,
                "motif": m.motif,
                "magasin_source": _magasin(m.magasin_source),
                "magasin_source_nom": m.magasin_source.magasin_nom if m.magasin_source else None,
                "magasin_destination": _magasin(m.magasin_destination),
                "magasin_destination_nom": m.magasin_destination.magasin_nom if m.magasin_destination else None,
                "details": [_detail(d) for d in m.details.all()],
            }
            for m in page["results"]
        ]
        return Response(page)
