import { useCallback, useState } from "react";

import { API_ENDPOINTS } from "@/config/endpoints";
import { useFileImport } from "@/hooks/useFileImport";

export const EXTENSIONS = [".xlsx", ".xls", ".csv"];

export function useImportEmployees() {
  const [overwrite, setOverwrite] = useState(true);
  const buildFields = useCallback(() => ({ overwrite: overwrite ? "true" : "false" }), [overwrite]);
  const importation = useFileImport({ endpoint: API_ENDPOINTS.EMPLOYEES_IMPORT, extensions: EXTENSIONS, buildFields });
  return { ...importation, overwrite, setOverwrite };
}
