import { API_ENDPOINTS } from "@/config/endpoints";
import { apiClient } from "@/lib/api/client";
import { createResource } from "@/lib/api/resource";
import { UPLOAD_TIMEOUT } from "@/config/env";

export const employeesApi = createResource(API_ENDPOINTS.EMPLOYEES);
export const sitesApi = createResource(API_ENDPOINTS.SITES);
export const directionsApi = createResource(API_ENDPOINTS.DIRECTIONS);
export const servicesApi = createResource(API_ENDPOINTS.SERVICES);

/** Import d'employés (``dry_run`` = aperçu sans enregistrement). */
export const importEmployees = (formData) =>
  apiClient
    .post(API_ENDPOINTS.EMPLOYEES_IMPORT, formData, { timeout: UPLOAD_TIMEOUT })
    .then((r) => r.data);

/** Les compteurs (effectifs, services...) des autres listes dépendent de chaque modification. */
export const ORGANISATION_KEYS = [["employees"], ["sites"], ["directions"], ["services"]];
