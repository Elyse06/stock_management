import { Box, Button, CircularProgress } from "@mui/material";
import { CheckCircle as CheckCircleIcon, Cancel as CancelIcon, HourglassEmpty as HourglassEmptyIcon } from "@mui/icons-material";

export function CommandeActions({
  onClose,
  onTraiter,
  peutTraiter,
  isAgentPrincipal,
  isAgentSecondaire,
  statut,
  traitement,
  magasinSource,
  validations, // 
}) {
  // 🆕 Vérifier si toutes les attributions ont été décidées
  const totalAttributions = Object.keys(validations || {}).length;
  const allDecided = totalAttributions > 0 && Object.values(validations).every(
    (v) => v.statut === "VALIDEE" || v.statut === "REFUSEE"
  );

  return (
    <Box sx={{ px: 3, pb: 2, display: "flex", gap: 1, justifyContent: "flex-end" }}>
      <Button onClick={onClose} disabled={traitement}>Fermer</Button>
      {peutTraiter && (
        <>
          <Button variant="outlined" color="error" onClick={() => onTraiter("REJETEE")} disabled={traitement} startIcon={traitement ? <CircularProgress size={16} /> : <CancelIcon />}>
            Rejeter
          </Button>
          {isAgentSecondaire && statut === "EN_ATTENTE" && (
            <Button variant="outlined" color="info" onClick={() => onTraiter("EN_COURS")} disabled={traitement} startIcon={traitement ? <CircularProgress size={16} /> : <HourglassEmptyIcon />}>
              Pré-valider
            </Button>
          )}
          {isAgentPrincipal && statut === "EN_COURS" && (
            <Button
              variant="contained"
              color="success"
              onClick={() => onTraiter("VALIDEE")}
              disabled={traitement || !magasinSource || !allDecided} // 🆕 Bloqué si pas toutes décidées
              startIcon={traitement ? <CircularProgress size={16} /> : <CheckCircleIcon />}
            >
              Valider la sortie
            </Button>
          )}
        </>
      )}
    </Box>
  );
}