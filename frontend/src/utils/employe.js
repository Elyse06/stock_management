/** Rattachement lisible d'un employé ``{service, direction, site}`` (champs à plat du serializer). */
export function getEmployeLocation(employe) {
  if (!employe) return null;
  const location = {
    service: employe.service_libelle || null,
    direction: employe.direction_libelle || null,
    site: employe.site_nom || null,
  };
  return location.service || location.direction || location.site ? location : null;
}
