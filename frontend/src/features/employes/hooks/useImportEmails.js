import { useCallback, useState } from "react";

import { API_ENDPOINTS } from "@/config/endpoints";
import { useFileImport } from "@/hooks/useFileImport";

export const EXTENSIONS_EMAILS = [".xlsx", ".xls", ".csv"];

/** Import des adresses de connexion des employés (aperçu puis confirmation). */
export function useImportEmails() {
  const [overwrite, setOverwrite] = useState(true);
  const buildFields = useCallback(() => ({ overwrite: overwrite ? "true" : "false" }), [overwrite]);
  const importation = useFileImport({ endpoint: API_ENDPOINTS.EMPLOYEES_IMPORT_EMAILS, extensions: EXTENSIONS_EMAILS, buildFields });
  return { ...importation, overwrite, setOverwrite };
}
