import { usePermission } from "@/features/auth/hooks/usePermission";

/**
 * Rôles du circuit de validation (alignés sur le backend) :
 * - agent principal (COM_VAL + CAT_GERE) : validation finale EN_COURS -> VALIDEE / REJETEE ;
 * - agent secondaire (COM_VAL seul)      : pré-validation EN_ATTENTE -> EN_COURS / REJETEE ;
 * - demandeur (COM_DEM sans COM_VAL)     : crée et supprime ses commandes EN_ATTENTE.
 */
export function useCommandeRoles() {
  const { canCreateCommande, canValidateCommande, canManageCatalogue } = usePermission();
  const isAgentPrincipal = canManageCatalogue && canValidateCommande;
  const isAgentSecondaire = !canManageCatalogue && canValidateCommande;

  return {
    canCreateCommande,
    isAgentPrincipal,
    isAgentSecondaire,
    isDemandeur: canCreateCommande && !canValidateCommande,
    peutTraiter: (commande) =>
      (isAgentPrincipal && commande?.statut === "EN_COURS") || (isAgentSecondaire && commande?.statut === "EN_ATTENTE"),
  };
}
