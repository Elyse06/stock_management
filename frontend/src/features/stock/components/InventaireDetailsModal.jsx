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
} from "@mui/material";
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Inventory as InventoryIcon,
} from "@mui/icons-material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

export function InventaireDetailsModal({ session, isOpen, onClose, onSuccess }) {
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { canValidateInventaire } = usePermission();
  const { confirmState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [validating, setValidating] = useState(false);

  const validerMutation = useMutation({
    mutationFn: async (id) => {
      const { data } = await apiClient.post(
        `${API_ENDPOINTS.INVENTAIRES}${id}/valider/`,
        {}
      );
      return data;
    },
    onSuccess: () => {
      notify.success("Inventaire validé avec succès. Le stock a été mis à jour.");
      if (onSuccess) onSuccess();
      queryClient.invalidateQueries({ queryKey: ["inventaires"] });
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

  const lignes = session.lignes ?? [];
  const nbArticles = lignes.length;
  const nbEcarts = lignes.filter((l) => Number(l.ecart) !== 0).length;
  const ecartTotal = lignes.reduce((sum, l) => sum + (Number(l.ecart) || 0), 0);
  const peutValider = canValidateInventaire && session.statut === "EN_ATTENTE";

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
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "#FFF8E1",
          borderBottom: "2px solid",
          borderColor: "primary.main",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography variant="h3">
            Inventaire <CodeChip value={session.code_reference} />
          </Typography>
          <StatusChip status={session.statut} />
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <InventaireInfoSection session={session} />
        <InventaireStatsCards
          nbArticles={nbArticles}
          nbEcarts={nbEcarts}
          ecartTotal={ecartTotal}
        />

        <Divider sx={{ mb: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "text.secondary",
            }}
          >
            <InventoryIcon fontSize="small" />
            <Typography variant="body2" fontWeight={600}>
              Détails des articles
            </Typography>
          </Box>
        </Divider>

        <InventaireArticlesTable lignes={lignes} />

        {lignes.some(
          (l) =>
            l.article_mode_suivi === "NUMERO_SERIE" &&
            l.propositions_series &&
            Object.keys(l.propositions_series).length > 0
        ) && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={600} color="text.secondary">
                Détail des propositions de numéros de série
              </Typography>
            </Divider>
            {lignes
              .filter(
                (l) =>
                  l.article_mode_suivi === "NUMERO_SERIE" &&
                  l.propositions_series &&
                  Object.keys(l.propositions_series).length > 0
              )
              .map((ligne) => (
                <Box key={ligne.id} sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                    {ligne.article} - {ligne.article_designation}
                  </Typography>
                  <PropositionsSeriesDisplay
                    propositions={ligne.propositions_series}
                  />
                </Box>
              ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
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
              validating ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <CheckCircleIcon />
              )
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