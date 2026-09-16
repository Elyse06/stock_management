import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { API_ENDPOINTS } from "../constants/api";

export function useCategoryOptions() {
  return useQuery({
    queryKey: ["categories", "options"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.CATEGORIES, {
        params: { page_size: 100 },
      });
      return data.results ?? data;
    },
    staleTime: 1000 * 60 * 10,
  });
}