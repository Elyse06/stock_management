import { useMemo } from "react";
import { Box, Chip, Grid, Paper, Skeleton, Typography } from "@mui/material";
import { Security as SecurityIcon } from "@mui/icons-material";

import { buildPermissionGroups, resolveRoles } from "../constants/roles";
import { THEME } from "../constants/theme";
import { useActions } from "../hooks/useActions";

import { PermissionMatrixTable } from "./PermissionMatrixTable";
import { RoleCard } from "./RoleCard";

export function RolesMatrixTab() {
  const { data: apiActions = [], isLoading } = useActions();

  const permissionGroups = useMemo(() => buildPermissionGroups(apiActions), [apiActions]);
  const existingActionIds = useMemo(() => apiActions.map((a) => a.action_id), [apiActions]);
  const visibleRoles = useMemo(
    () => resolveRoles(existingActionIds).filter((r) => r.id !== "CUSTOM"),
    [existingActionIds],
  );

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Profils d'accès prédéfinis
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {visibleRoles.map((role) => (
          <RoleCard key={role.id} role={role} />
        ))}
      </Grid>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 0.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
          <SecurityIcon fontSize="small" sx={{ color: THEME.primary }} />
          Rôles et permissions
          <Chip
            size="small"
            label={`${apiActions.length} permission${apiActions.length > 1 ? "s" : ""}`}
            sx={{ fontWeight: 600, fontSize: "0.7rem", bgcolor: THEME.primaryVeryLight, color: THEME.textStrong, border: `1px solid ${THEME.primaryBorder}` }}
          />
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
        Les profils sont des modèles. Pour modifier les permissions d'une personne, ouvrez son compte dans l'onglet Utilisateurs.
        Les permissions elles-mêmes sont des codes système, définis côté serveur.
      </Typography>

      {isLoading ? (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={40} />
          ))}
        </Paper>
      ) : permissionGroups.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
          <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
            Aucune permission enregistrée
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Les permissions sont créées côté serveur par la commande « seed_data ».
          </Typography>
        </Paper>
      ) : (
        <PermissionMatrixTable visibleRoles={visibleRoles} permissionGroups={permissionGroups} />
      )}
    </Box>
  );
}