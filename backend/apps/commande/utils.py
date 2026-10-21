import json
import uuid

QR_SELECT_RELATED = (
    "detail_commande__article",
    "affectation__employe__emp_serv_id__serv_dir_id",
    "affectation__employe__emp_site_id",
    "affectation__direction",
    "affectation__salle__localite",
    "affectation__site",
)


def generate_attribution_qr_payload(attribution) -> str:
    return json.dumps(attribution.get_qr_payload(), default=str)


def qr_payloads_par_code(codes) -> dict:
    from apps.commande.models import AttributionDetailCommande

    uuids = set()
    for code in codes:
        try:
            uuids.add(uuid.UUID(str(code)))
        except (TypeError, ValueError):
            continue
    if not uuids:
        return {}
    attributions = AttributionDetailCommande.objects.filter(
        code_unique__in=uuids
    ).select_related(*QR_SELECT_RELATED)
    return {str(a.code_unique): generate_attribution_qr_payload(a) for a in attributions}
