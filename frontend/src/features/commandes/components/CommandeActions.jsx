import { Box, Button, CircularProgress, Typography } from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as HourglassEmptyIcon,
} from "@mui/icons-material";

export function CommandeActions({
  onClose,
  onTraiter,
  peutTraiter,
  isAgentPrincipal,
  isAgentSecondaire,
  statut,
  traitement,
  magasinSource,
  validations,
}) {
  // Toutes les attributions ont-elles été décidées ?
  const decisions = Object.values(validations || {});
  const total = decisions.length;
  const decidees = decisions.filter(
    (v) => v.statut === "VALIDEE" || v.statut === "REFUSEE"
  ).length;
  const allDecided = total > 0 && decidees === total;

  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3 },
        py: 1.5,
        display: "flex",
        flexDirection: { xs: "column-reverse", sm: "row" },
        alignItems: { xs: "stretch", sm: "center" },
        justifyContent: "space-between",
        gap: 1.5,
        borderTop: "1px solid #E0E0E0",
        bgcolor: "#FAFAFA",
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {peutTraiter && total > 0
          ? `${decidees} / ${total} attribution(s) traitée(s)`
          : ""}
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          justifyContent: "flex-end",
          "& > button": { flex: { xs: 1, sm: "none" } },
        }}
      >
        <Button onClick={onClose} disabled={traitement}>
          Fermer
        </Button>

        {peutTraiter && (
          <>
            <Button
              variant="outlined"
              color="error"
              onClick={() => onTraiter("REJETEE")}
              disabled={traitement}
              startIcon={traitement ? <CircularProgress size={16} /> : <CancelIcon />}
            >
              Rejeter
            </Button>

            {isAgentSecondaire && statut === "EN_ATTENTE" && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => onTraiter("EN_COURS")}
                disabled={traitement || !allDecided}
                startIcon={traitement ? <CircularProgress size={16} /> : <HourglassEmptyIcon />}
              >
                Transmettre (pré-valider)
              </Button>
            )}

            {isAgentPrincipal && statut === "EN_COURS" && (
              <Button
                variant="contained"
                color="success"
                onClick={() => onTraiter("VALIDEE")}
                disabled={traitement || !magasinSource || !allDecided}
                startIcon={traitement ? <CircularProgress size={16} /> : <CheckCircleIcon />}
              >
                Valider la sortie
              </Button>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
