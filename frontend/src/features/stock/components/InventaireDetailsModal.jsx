import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Grid,
} from "@mui/material";
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Store as StoreIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  Assignment as AssignmentIcon,
  Inventory as InventoryIcon,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { apiClient } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";

export function InventaireDetailsModal({ session, isOpen, onClose, onSuccess }) {
  const { hasAction } = useAuth();

  // TODO: Implémenter les permissions réelles avec hasAction
  // Exemple: const canValidate = hasAction('INV_VAL');
  const canValidate = true;

  const [validating, setValidating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!session) return null;

  // ====== HELPERS ======
  const getStatutColor = (statut) => {
    switch (statut) {
      case "EN_ATTENTE":
        return "warning";
      case "VALIDE":
        return "success";
      case "REJETE":
        return "error";
      default:
        return "default";
    }
  };

  const getStatutLabel = (statut) => {
    switch (statut) {
      case "EN_ATTENTE":
        return "En attente";
      case "VALIDE":
        return "Validé";
      case "REJETE":
        return "Rejeté";
      default:
        return statut;
    }
  };

  const isMagasin = Boolean(session.magasin);
  const lieuIcon = isMagasin ? <StoreIcon /> : <BusinessIcon />;
  const lieuType = isMagasin ? "Magasin" : "Département";

  // ====== VALIDATION DE L'INVENTAIRE ======
  const handleValider = async () => {
    if (
      !window.confirm(
        "Valider cet inventaire va mettre à jour le stock automatiquement (mouvements d'ajustement). Cette action est irréversible. Continuer ?"
      )
    ) {
      return;
    }

    setValidating(true);
    setError("");
    setSuccess("");

    try {
      // ✅ Endpoint spécifique pour la validation (pas un PUT sur le statut)
      const { data } = await apiClient.post(
        `/api/stock/inventaires/${session.inventaire_id}/valider/`,
        {}
      );

      setSuccess("Inventaire validé avec succès. Le stock a été mis à jour.");

      if (onSuccess) onSuccess();

      // Mettre à jour la session affichée avec les nouvelles données
      // (le parent rechargera via onSuccess)
    } catch (err) {
      const detail = err?.response?.data;
      if (detail && typeof detail === "object") {
        setError(
          Object.entries(detail)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ")
        );
      } else {
        setError("Erreur lors de la validation de l'inventaire.");
      }
    } finally {
      setValidating(false);
    }
  };

  // ====== COLONNES DU DATAGRID ======
  const columns = [
    {
      field: "article",
      headerName: "Code",
      width: 120,
      renderCell: (params) => (
        <Typography
          variant="body2"
          fontFamily="monospace"
          fontWeight={600}
          sx={{
            bgcolor: "#FFF8E1",
            px: 1,
            py: 0.3,
            borderRadius: 0.5,
            border: "1px solid #F9A825",
          }}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: "article_designation",
      headerName: "Article",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "quantite_theorique",
      headerName: "Théorique",
      width: 120,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Typography variant="body2" fontFamily="monospace">
          {params.value}
        </Typography>
      ),
    },
    {
      field: "quantite_physique",
      headerName: "Physique",
      width: 120,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: "ecart",
      headerName: "Écart",
      width: 120,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        const ecart = Number(params.value);
        const color = ecart === 0 ? "success.main" : "error.main";
        return (
          <Typography
            variant="body2"
            fontFamily="monospace"
            fontWeight={700}
            sx={{ color }}
          >
            {ecart > 0 ? `+${ecart}` : ecart}
          </Typography>
        );
      },
    },
    {
      field: "commentaire",
      headerName: "Commentaire",
      flex: 1,
      minWidth: 180,
      renderCell: (params) =>
        params.value ? (
          <Typography variant="body2" color="text.secondary">
            {params.value}
          </Typography>
        ) : (
          <Chip label="—" size="small" variant="outlined" />
        ),
    },
  ];

  // ====== STATS RAPIDES ======
  const lignes = session.lignes ?? [];
  const nbArticles = lignes.length;
  const nbEcarts = lignes.filter((l) => Number(l.ecart) !== 0).length;
  const ecartTotal = lignes.reduce(
    (sum, l) => sum + (Number(l.ecart) || 0),
    0
  );

  const peutValider = canValidate && session.statut === "EN_ATTENTE";

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      {/* ====== HEADER ====== */}
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
            Inventaire{" "}
            <Typography
              component="span"
              variant="h3"
              fontFamily="monospace"
              fontWeight={700}
            >
              {session.code_reference}
            </Typography>
          </Typography>
          <Chip
            label={getStatutLabel(session.statut)}
            color={getStatutColor(session.statut)}
            size="small"
          />
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* ====== BODY ====== */}
      <DialogContent sx={{ pt: 3 }}>
        {/* Alertes */}
        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" onClose={() => setSuccess("")} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* ====== INFOS GÉNÉRALES ====== */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h3" sx={{ mb: 1.5 }}>
            Informations générales
          </Typography>

          <Grid container spacing={2}>
            {/* Lieu */}
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                {lieuIcon}
                <Typography variant="body2" color="text.secondary">
                  {lieuType}
                </Typography>
              </Box>
              <Typography variant="body1" fontWeight={500}>
                {session.lieu_nom || "—"}
              </Typography>
            </Grid>

            {/* Statut */}
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <AssignmentIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Statut
                </Typography>
              </Box>
              <Chip
                label={getStatutLabel(session.statut)}
                color={getStatutColor(session.statut)}
                size="small"
              />
            </Grid>

            {/* Date création */}
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <CalendarIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Date de création
                </Typography>
              </Box>
              <Typography variant="body1">
                {new Date(session.date_creation).toLocaleString("fr-FR")}
              </Typography>
            </Grid>

            {/* Date validation */}
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <CheckCircleIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Date de validation
                </Typography>
              </Box>
              <Typography variant="body1">
                {session.date_validation
                  ? new Date(session.date_validation).toLocaleString("fr-FR")
                  : "—"}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* ====== STATS RAPIDES ====== */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
            gap: 2,
            mb: 3,
          }}
        >
          <Box
            sx={{
              p: 2,
              bgcolor: "#FAFAFA",
              borderRadius: 1,
              border: "1px solid #E0E0E0",
              textAlign: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Articles comptés
            </Typography>
            <Typography variant="h2" color="primary.main">
              {nbArticles}
            </Typography>
          </Box>

          <Box
            sx={{
              p: 2,
              bgcolor: "#FAFAFA",
              borderRadius: 1,
              border: "1px solid #E0E0E0",
              textAlign: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Articles avec écart
            </Typography>
            <Typography
              variant="h2"
              color={nbEcarts > 0 ? "error.main" : "success.main"}
            >
              {nbEcarts}
            </Typography>
          </Box>

          <Box
            sx={{
              p: 2,
              bgcolor: "#FAFAFA",
              borderRadius: 1,
              border: "1px solid #E0E0E0",
              textAlign: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Écart total
            </Typography>
            <Typography
              variant="h2"
              sx={{
                color: ecartTotal === 0 ? "success.main" : "error.main",
              }}
            >
              {ecartTotal > 0 ? `+${ecartTotal}` : ecartTotal}
            </Typography>
          </Box>
        </Box>

        {/* ====== LIGNES D'INVENTAIRE ====== */}
        <Divider sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
            <InventoryIcon fontSize="small" />
            <Typography variant="body2" fontWeight={600}>
              Articles inventoriés ({nbArticles})
            </Typography>
          </Box>
        </Divider>

        <Box sx={{ height: 400, width: "100%" }}>
          <DataGrid
            rows={lignes}
            columns={columns}
            getRowId={(row) => row.id}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
            }}
            localeText={{
              noRowsLabel: "Aucun article dans cet inventaire.",
            }}
          />
        </Box>

        {/* Info validation */}
        {peutValider && (
          <Alert severity="info" sx={{ mt: 2 }}>
            💡 La validation de cet inventaire générera automatiquement des mouvements
            d'ajustement pour corriger les écarts entre stock théorique et stock physique.
          </Alert>
        )}

        {session.statut === "VALIDE" && (
          <Alert severity="success" sx={{ mt: 2 }}>
            ✅ Cet inventaire a été validé. Les mouvements d'ajustement ont été générés
            automatiquement.
          </Alert>
        )}

        {session.statut === "REJETE" && (
          <Alert severity="error" sx={{ mt: 2 }}>
            ❌ Cet inventaire a été rejeté. Aucun ajustement de stock n'a été effectué.
          </Alert>
        )}
      </DialogContent>

      {/* ====== FOOTER ====== */}
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
    </Dialog>
  );
}