import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";

export function usePermission() {
  const { hasAction, hasAnyAction, user } = useAuth();

  const permissions = useMemo(() => ({
    // Catalogue
    canReadCatalogue: hasAction("CAT_LIRE"),
    canManageCatalogue: hasAction("CAT_GERE"),
    
    // Commandes
    canCreateCommande: hasAction("COM_DEM"),
    canValidateCommande: hasAction("COM_VAL"),
    
    // Inventaire
    canReadInventaire: hasAction("INV_LIRE"),
    canManageInventaire: hasAction("INV_GERE"),
    canValidateInventaire: hasAction("INV_VAL"),
    
    // Mouvements
    canReadMouvements: hasAction("MOV_LIRE"),
    canManageMouvements: hasAction("MOV_GERE"),
  }), [hasAction]);

  return {
    ...permissions,
    hasAction,
    hasAnyAction,
    user,
  };
}