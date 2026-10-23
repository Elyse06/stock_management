import { Box, Button, CircularProgress, Typography } from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as HourglassEmptyIcon,
} from "@mui/icons-material";

import { aDesDecisions, aDesLivraisons, DECIDEES } from "../utils/traitementCommande";

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
  livreePartiellement = false,
}) {
  // Toutes les lignes à traiter ont-elles une décision ?
  const decisions = Object.values(validations || {});
  const total = decisions.length;
  const decidees = decisions.filter((v) => DECIDEES.includes(v.statut)).length;
  const allDecided = total > 0 && decidees === total;
  // Validation finale : « Valider la sortie » s'il y a quelque chose à livrer, sinon on enregistre
  // seulement les refus (le reste demeurant en attente d'achat).
  const livraison = aDesLivraisons(validations);

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
          ? `${decidees} / ${total} ligne(s) décidée(s)`
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
              {/* Déjà livrée en partie : seul le reste est refusé, le matériel remis reste remis. */}
              {isAgentPrincipal && livreePartiellement ? "Clôturer (refuser le reste)" : "Rejeter"}
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
                disabled={traitement || !allDecided || !aDesDecisions(validations) || (livraison && !magasinSource)}
                startIcon={traitement ? <CircularProgress size={16} /> : <CheckCircleIcon />}
              >
                {livraison ? "Valider la sortie" : "Enregistrer les décisions"}
              </Button>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
