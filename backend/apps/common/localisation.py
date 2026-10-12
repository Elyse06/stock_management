from django.db.models import Q


def filtre_direction(direction_id, prefix="affectation__"):
    return Q(**{f"{prefix}direction_id": direction_id}) | Q(
        **{f"{prefix}employe__emp_serv_id__serv_dir_id": direction_id}
    )


def filtre_site(site_id, prefix="affectation__"):
    return (
        Q(**{f"{prefix}site_id": site_id})
        | Q(**{f"{prefix}employe__emp_site_id": site_id})
        | Q(**{f"{prefix}salle__localite_id": site_id})
    )


def filtre_salle(salle_id, prefix="affectation__"):
    return Q(**{f"{prefix}salle_id": salle_id})


def filtre_localisation(direction_id=None, site_id=None, salle_id=None, prefix="affectation__"):
    if direction_id:
        return filtre_direction(direction_id, prefix)
    if site_id:
        return filtre_site(site_id, prefix)
    if salle_id:
        return filtre_salle(salle_id, prefix)
    return None
