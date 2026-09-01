import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  Alert,
  Divider,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { WizardStepper } from "./WizardStepper";

/**
 * Composant wizard réutilisable qui encapsule toute la structure d'un wizard multi-étapes.
 */
export function WizardDialog({
  isOpen,
  onClose,
  steps,
  activeStep,
  title,
  mode = "CRÉATION",
  error = "",
  onErrorClose,
  children,
  actions,
}) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2, minHeight: 500 } }}
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
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              bgcolor: mode === "ÉDITION" ? "primary.main" : "success.main",
              color: "white",
              borderRadius: 1,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {mode}
          </Box>
          <Typography variant="h3">{title}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* ====== STEPPER ====== */}
      <Box sx={{ px: 3, pt: 3, pb: 1 }}>
        <WizardStepper steps={steps} activeStep={activeStep} />
      </Box>
      <Divider />

      {/* ====== CONTENU ====== */}
      <DialogContent sx={{ pt: 3, minHeight: 300 }}>
        {error && (
          <Alert severity="error" onClose={onErrorClose} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {children}
      </DialogContent>

      {/* ====== ACTIONS ====== */}
      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>{actions}</DialogActions>
    </Dialog>
  );
}