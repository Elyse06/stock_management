import { apiClient } from "./client";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";

export const MAX_PAGE_SIZE = 100;
const MAX_PAGES = 200;

export function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined),
  );
}

export function normalizeList(data) {
  const rows = data?.results ?? data ?? [];
  const liste = Array.isArray(rows) ? rows : [];
  const { results: _results, next: _next, previous: _previous, count: _count, ...extra } = Array.isArray(data) ? {} : (data ?? {});
  return { ...extra, rows: liste, count: data?.count ?? liste.length };
}

export async function fetchPage(endpoint, { page = 0, pageSize = DEFAULT_PAGE_SIZE, ...filters } = {}, config = {}) {
  const { data } = await apiClient.get(endpoint, {
    ...config,
    params: cleanParams({ ...filters, page: page + 1, page_size: Math.min(pageSize, MAX_PAGE_SIZE) }),
  });
  return normalizeList(data);
}

export async function fetchAllPages(endpoint, params = {}, config = {}) {
  const resultats = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data } = await apiClient.get(endpoint, {
      ...config,
      params: cleanParams({ ...params, page, page_size: MAX_PAGE_SIZE }),
    });
    const { rows } = normalizeList(data);
    resultats.push(...rows);
    if (!data?.results || !data.next) break;
  }
  return resultats;
}
