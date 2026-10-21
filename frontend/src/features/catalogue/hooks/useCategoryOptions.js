import { API_ENDPOINTS } from "@/config/endpoints";
import { useOptions } from "@/hooks/useOptions";

export const useCategoryOptions = () => useOptions("categories", API_ENDPOINTS.CATEGORIES);
