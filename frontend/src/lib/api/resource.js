import { apiClient } from "./client";
import { fetchAllPages, fetchPage } from "./pagination";

/**
 * Service REST générique pour une ressource DRF (``ModelViewSet``).
 *
 * >>> const categoriesApi = createResource(API_ENDPOINTS.CATEGORIES);
 * >>> await categoriesApi.list({ page: 0, pageSize: 20, search: "x" });
 */
export function createResource(endpoint) {
  const url = (id) => `${endpoint}${encodeURIComponent(id)}/`;
  return {
    endpoint,
    url,
    list: (params, config) => fetchPage(endpoint, params, config),
    listAll: (params, config) => fetchAllPages(endpoint, params, config),
    get: (id, config) => apiClient.get(url(id), config).then((r) => r.data),
    create: (payload) => apiClient.post(endpoint, payload).then((r) => r.data),
    update: (id, payload) => apiClient.put(url(id), payload).then((r) => r.data),
    patch: (id, payload) => apiClient.patch(url(id), payload).then((r) => r.data),
    remove: (id) => apiClient.delete(url(id)).then((r) => r.data),
    action: (id, name, payload, config) =>
      apiClient.post(`${url(id)}${name}/`, payload, config).then((r) => r.data),
  };
}
