import { API_ENDPOINTS } from "@/config/endpoints";
import { createResource } from "@/lib/api/resource";

export const utilisateursApi = createResource(API_ENDPOINTS.UTILISATEURS);
