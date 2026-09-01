import { Button, Box, CircularProgress } from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Save as SaveIcon,
} from "@mui/icons-material";

/**
 * Boutons de navigation du wizard (Précédent/Suivant/Enregistrer).
 */
export function WizardActions({
  activeStep,
  totalSteps,
  onBack,
  onNext,
  onSubmit,
  isLastStep,
  loading = false,
  submitLabel = "Enregistrer",
  disabled = false,
}) {
  if (isLastStep) {
    return (
      <>
        <Button onClick={onBack} startIcon={<ArrowBackIcon />}>
          Précédent
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={loading || disabled}
          startIcon={
            loading ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <SaveIcon />
            )
          }
        >
          {loading ? "Enregistrement..." : submitLabel}
        </Button>
      </>
    );
  }

  return (
    <>
      {activeStep > 0 && (
        <Button onClick={onBack} startIcon={<ArrowBackIcon />}>
          Précédent
        </Button>
      )}
      <Box sx={{ flex: 1 }} />
      <Button variant="contained" onClick={onNext} endIcon={<ArrowForwardIcon />}>
        Suivant
      </Button>
    </>
  );
}