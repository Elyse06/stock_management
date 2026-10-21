import { API_ENDPOINTS } from "@/config/endpoints";

import { useOptions } from "./useOptions";

export const useSites = (options) => useOptions("sites", API_ENDPOINTS.SITES, {}, options);
export const useDirections = (options) => useOptions("directions", API_ENDPOINTS.DIRECTIONS, {}, options);
export const useServices = (options) => useOptions("services", API_ENDPOINTS.SERVICES, {}, options);
export const useEmployees = (options) => useOptions("employees", API_ENDPOINTS.EMPLOYEES, {}, options);
export const useMagasins = (options) => useOptions("magasins", API_ENDPOINTS.MAGASINS, {}, options);
export const useSalles = (options) => useOptions("salles", API_ENDPOINTS.SALLES, {}, options);
export const useArticles = (params = {}, options) => useOptions("articles", API_ENDPOINTS.ARTICLES, params, options);

export const toOptions = (items, getValue, getLabel, libelleTous) => [
  ...(libelleTous ? [{ value: "", label: libelleTous }] : []),
  ...items.map((item) => ({ value: getValue(item), label: getLabel(item) })),
];
