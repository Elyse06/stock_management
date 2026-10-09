import { Alert, Box, Step, StepLabel, Stepper } from "@mui/material";

const STEPS = ["Demande envoyée", "Pré-validation", "Validation finale"];
const ACTIVE_STEP = { EN_ATTENTE: 1, EN_COURS: 2, VALIDEE: 3 };

/** Avancement de la commande : demande → pré-validation → validation finale. */
export function CommandeProgress({ statut }) {
  if (statut === "REJETEE") {
    return (
      <Alert severity="error" variant="outlined" sx={{ mb: 3 }}>
        Cette commande a été rejetée.
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        mb: 3,
        py: 1.5,
        px: { xs: 0, sm: 2 },
        border: "1px solid #E0E0E0",
        borderRadius: 1,
        bgcolor: "background.paper",
      }}
    >
      <Stepper
        activeStep={ACTIVE_STEP[statut] ?? 0}
        alternativeLabel
        sx={{
          "& .MuiStepIcon-root.Mui-completed": { color: "primary.main" },
          "& .MuiStepIcon-root.Mui-active": { color: "secondary.main" },
          "& .MuiStepIcon-root.Mui-active .MuiStepIcon-text": { fill: "#000" },
          "& .MuiStepLabel-label": { fontSize: 12 },
          "& .MuiStepLabel-label.Mui-active": { fontWeight: 600 },
        }}
      >
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
}
