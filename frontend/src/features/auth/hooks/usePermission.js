import { useMemo } from "react";

import { ACTIONS as A } from "@/constants/permissions";

import { useAuth } from "../context/AuthContext";

export function usePermission() {
  const { hasAction, hasAnyAction, user } = useAuth();

  const permissions = useMemo(
    () => ({
      canReadCatalogue: hasAction(A.CAT_LIRE),
      canManageCatalogue: hasAction(A.CAT_GERE),
      canCreateCommande: hasAction(A.COM_DEM),
      canValidateCommande: hasAction(A.COM_VAL),
      isGestionnaire: hasAction(A.COM_VAL, A.CAT_GERE),
      canReadInventaire: hasAction(A.INV_LIRE),
      canManageInventaire: hasAction(A.INV_GERE),
      canValidateInventaire: hasAction(A.INV_VAL),
      canReadMouvements: hasAction(A.MOV_LIRE),
      canManageMouvements: hasAction(A.INV_GERE),
      canReadHistorique: hasAction(A.MOV_LIRE),
      canSeeDashboard: hasAnyAction(A.MOV_LIRE, A.CAT_GERE),
      canViewArticleDetail: hasAnyAction(A.MOV_LIRE, A.CAT_GERE),
      canImport: hasAction(A.CAT_GERE),
      canManageUsers: hasAction(A.USR_GERE),
      canManageEmployee: hasAction(A.USR_GERE),
    }),
    [hasAction, hasAnyAction],
  );

  return { ...permissions, hasAction, hasAnyAction, user };
}
