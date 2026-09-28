import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS } from "../../../constants/api";

export function useActions() {
  return useQuery({
    queryKey: ["actions"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.ACTIONS);
      return Array.isArray(data) ? data : data?.results || [];
    },
    staleTime: 2 * 60 * 1000,
  });
}