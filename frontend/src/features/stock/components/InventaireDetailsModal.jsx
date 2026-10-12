import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  Divider,
  CircularProgress,
  Skeleton,
  Alert,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Inventory as InventoryIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS } from "../../../constants/api";
import { usePermission } from "../../../hooks/usePermission";
import { useNotification } from "../../../components/common/NotificationProvider";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { StatusChip } from "../../../components/common/StatusChip";
import { CodeChip } from "../../../components/common/CodeChip";
import { ConfirmDialog } from "../../../components/common/ConfirmDialog";
import { InventaireInfoSection } from "./InventaireInfoSection";
import { InventaireStatsCards } from "./InventaireStatsCards";
import { InventaireArticlesTable } from "./InventaireArticlesTable";
import { PropositionsSeriesDisplay } from "./PropositionsSeriesDisplay";

const aDesPropositions = (ligne) =>
  ligne.article_mode_suivi === "NUMERO_SERIE" &&
  ligne.propositions_series &&
  Object.keys(ligne.propositions_series).length > 0;

export function InventaireDetailsModal({ session, isOpen, onClose, onSuccess }) {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { canValidateInventaire } = usePermission();
  const { confirmState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [validating, setValidating] = useState(false);
  const id = session?.inventaire_id;

  // La liste n'a pas besoin des lignes : on les charge ici, à l'ouverture
  const { data: complet, isLoading, error, refetch } = useQuery({
    queryKey: ["inventaire", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`${API_ENDPOINTS.INVENTAIRES}${id}/`);
      return data;
    },
    enabled: Boolean(isOpen && id),
    staleTime: 1000 * 30,
  });

  const validerMutation = useMutation({
    mutationFn: async (inventaireId) => {
      const { data } = await apiClient.post(
        `${API_ENDPOINTS.INVENTAIRES}${inventaireId}/valider/`,
        {}
      );
      return data;
    },
    onSuccess: () => {
      notify.success("Inventaire validé avec succès. Le stock a été mis à jour.");
      if (onSuccess) onSuccess();
      queryClient.invalidateQueries({ queryKey: ["inventaires"] });
      queryClient.invalidateQueries({ queryKey: ["inventaire", id] });
    },
    onError: (err) => {
      const detail = err?.response?.data;
      if (detail && typeof detail === "object") {
        notify.error(
          Object.entries(detail)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ")
        );
      } else {
        notify.error("Erreur lors de la validation de l'inventaire.");
      }
    },
    onSettled: () => setValidating(false),
  });

  if (!session) return null;

  // Les infos de la ligne s'affichent tout de suite ; les lignes arrivent ensuite
  const courant = complet ?? session;
  const lignes = complet?.lignes ?? null;
  const nbEcarts = lignes ? lignes.filter((l) => Number(l.ecart) !== 0).length : 0;
  const ecartTotal = lignes ? lignes.reduce((sum, l) => sum + (Number(l.ecart) || 0), 0) : 0;
  const peutValider = canValidateInventaire && courant.statut === "EN_ATTENTE" && Boolean(lignes);

  const handleValider = () => {
    confirm(
      "Valider l'inventaire",
      "Voulez-vous vraiment valider cet inventaire ? Cette action est irréversible. Continuer ?",
      async () => {
        setValidating(true);
        await validerMutation.mutateAsync(session.inventaire_id);
      }
    );
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 2 } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 1,
          bgcolor: "tint.main",
          borderBottom: "2px solid",
          borderColor: "secondary.main",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="h3" component="span">
              Inventaire
            </Typography>
            {courant.code_reference && <CodeChip value={courant.code_reference} />}
          </Box>
          <Box sx={{ mt: 1 }}>
            <StatusChip status={courant.statut} />
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, px: { xs: 2, sm: 3 } }}>
        <InventaireInfoSection session={courant} />

        {isLoading && (
          <Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, mb: 3 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="rounded" height={72} />
              ))}
            </Box>
            <Skeleton variant="rounded" height={220} />
          </Box>
        )}

        {error && (
          <Alert
            severity="error"
            variant="outlined"
            action={
              <Button color="inherit" size="small" onClick={() => refetch()}>
                Réessayer
              </Button>
            }
          >
            Impossible de charger les articles de cet inventaire.
          </Alert>
        )}

        {lignes && (
          <>
            <InventaireStatsCards
              nbArticles={lignes.length}
              nbEcarts={nbEcarts}
              ecartTotal={ecartTotal}
            />

            <Divider sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
                <InventoryIcon fontSize="small" />
                <Typography variant="body2" fontWeight={600}>
                  Détails des articles
                </Typography>
              </Box>
            </Divider>

            <InventaireArticlesTable lignes={lignes} />

            {lignes.some(aDesPropositions) && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    Détail des propositions de numéros de série
                  </Typography>
                </Divider>
                {lignes.filter(aDesPropositions).map((ligne) => (
                  <Box key={ligne.id} sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                      {ligne.article} - {ligne.article_designation}
                    </Typography>
                    <PropositionsSeriesDisplay propositions={ligne.propositions_series} />
                  </Box>
                ))}
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          py: 1.5,
          borderTop: "1px solid #E0E0E0",
          bgcolor: "#FAFAFA",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Button onClick={onClose} disabled={validating}>
          Fermer
        </Button>
        {peutValider && (
          <Button
            variant="contained"
            color="success"
            onClick={handleValider}
            disabled={validating}
            startIcon={
              validating ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />
            }
          >
            {validating ? "Validation..." : "Valider l'inventaire"}
          </Button>
        )}
      </DialogActions>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Dialog>
  );
}
