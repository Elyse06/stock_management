import { useMemo, useState } from "react";
import { Box, Typography, Paper, Chip, Grid, Button, Skeleton } from "@mui/material";
import { Security as SecurityIcon, Add as AddIcon } from "@mui/icons-material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS } from "../../../constants/api";
import { useNotification } from "../../../components/common/NotificationProvider";
import { THEME, primaryButtonSx } from "./theme";
import { buildPermissionGroups, resolveRoles } from "./permissions";
import { useActions } from "./useActions.js";
import { extractApiError } from "./apiError";
import { RoleCard } from "./RoleCard";
import { PermissionMatrixTable } from "./PermissionMatrixTable";
import { ActionFormDialog } from "./ActionFormDialog";

export function RolesMatrixTab() {
  const queryClient = useQueryClient();
  const notify = useNotification();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: apiActions = [], isLoading } = useActions();

  const permissionGroups = useMemo(() => buildPermissionGroups(apiActions), [apiActions]);
  const existingActionIds = useMemo(() => apiActions.map((a) => a.action_id), [apiActions]);
  const visibleRoles = useMemo(
    () => resolveRoles(existingActionIds).filter((r) => r.id !== "CUSTOM"),
    [existingActionIds],
  );

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post(API_ENDPOINTS.ACTIONS, payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["actions"] });
      queryClient.invalidateQueries({ queryKey: ["utilisateurs"] });
      notify.success(`La permission ${data.action_id} a été créée.`);
      setDialogOpen(false);
    },
  });

  const openDialog = () => {
    createMutation.reset();
    setDialogOpen(true);
  };

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
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openDialog} sx={primaryButtonSx}>
          Nouvelle permission
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
        Les profils sont des modèles. Pour modifier les permissions d'une personne, ouvrez son compte dans l'onglet Utilisateurs.
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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Créez la première permission pour pouvoir l'attribuer aux utilisateurs.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openDialog} sx={primaryButtonSx}>
            Créer une permission
          </Button>
        </Paper>
      ) : (
        <PermissionMatrixTable visibleRoles={visibleRoles} permissionGroups={permissionGroups} />
      )}

      <ActionFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={(payload) => createMutation.mutate(payload)}
        isSubmitting={createMutation.isPending}
        serverError={
          createMutation.isError
            ? extractApiError(createMutation.error, "Impossible de créer la permission.")
            : ""
        }
        existingActionIds={existingActionIds}
      />
    </Box>
  );
}