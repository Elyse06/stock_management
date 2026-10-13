import { API_ENDPOINTS } from "@/config/endpoints";
import { useOptions } from "@/hooks/useOptions";

/** Actions (droits) définies côté backend : liste en lecture seule. */
export const useActions = () => useOptions("actions", API_ENDPOINTS.ACTIONS);
