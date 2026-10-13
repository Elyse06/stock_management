import { API_ENDPOINTS } from "@/config/endpoints";
import { useFileImport } from "@/hooks/useFileImport";

/** Le backend n'accepte que les classeurs Excel pour les fournitures. */
export const EXTENSIONS_FOURNITURES = [".xlsx", ".xls"];

export const useImportFournitures = () =>
  useFileImport({ endpoint: API_ENDPOINTS.IMPORT_FOURNITURES, extensions: EXTENSIONS_FOURNITURES });
