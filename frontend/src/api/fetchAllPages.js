import { apiClient } from "./client";

export async function fetchAllPages(endpoint, params = {}) {
  const results = [];
  let page = 1;

  while (true) {
    const { data } = await apiClient.get(endpoint, {
      params: { ...params, page },
    });
    const pageResults = data.results ?? data;
    if (!Array.isArray(pageResults)) {
      throw new Error(`Expected a list response from ${endpoint}.`);
    }
    results.push(...pageResults);
    if (!data.results || !data.next) return results;
    page += 1;
  }
}
