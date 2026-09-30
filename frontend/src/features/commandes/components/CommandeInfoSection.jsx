import { Box, Typography, Chip } from "@mui/material";
import {
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Cancel as CancelIcon,
  Comment as CommentIcon,
} from "@mui/icons-material";
import { EmptyValue } from "../../../components/common/EmptyValue";
import { formatDateTime } from "../../../utils/formatters";

const STATUT_CONFIG = {
  EN_COURS: {
    label: "Pré-validé par",
    icon: <HourglassEmptyIcon fontSize="small" sx={{ color: "#1976D2" }} />,
    chipColor: "info",
    chipLabel: "En attente de validation finale",
  },
  VALIDEE: {
    label: "Validé par",
    icon: <CheckCircleIcon fontSize="small" sx={{ color: "#2E7D32" }} />,
    chipColor: "success",
    chipLabel: "Validée",
  },
  REJETEE: {
    label: "Rejeté par",
    icon: <CancelIcon fontSize="small" sx={{ color: "#C62828" }} />,
    chipColor: "error",
    chipLabel: "Rejetée",
  },
};

export function CommandeInfoSection({ commande }) {
  const config = STATUT_CONFIG[commande.statut] || STATUT_CONFIG.EN_COURS;
  const traitantNom = commande.traitant?.nom || commande.employe_traitant;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h3" sx={{ mb: 1.5 }}>
        Informations générales
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="body2" color="text.secondary">
            Objet
          </Typography>
          <Typography variant="body1" fontWeight={500}>
            <EmptyValue value={commande.objet} />
          </Typography>
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary">
            Demandeur
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <PersonIcon fontSize="small" color="action" />
            <Typography variant="body1">
              {commande.demandeur?.nom || commande.employe_demandeur || "—"}
            </Typography>
          </Box>
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary">
            Date de demande
          </Typography>
          <Typography variant="body1">
            {formatDateTime(commande.date_commande)}
          </Typography>
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary">
            {config.label}
          </Typography>
          {traitantNom ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
              {config.icon}
              <Typography variant="body1" fontWeight={500}>
                {traitantNom}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body1" color="text.secondary">
              —
            </Typography>
          )}
          {commande.date_traitement && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              Le {formatDateTime(commande.date_traitement)}
            </Typography>
          )}
        </Box>

        {(commande.statut === "EN_COURS" || commande.statut === "VALIDEE" || commande.statut === "REJETEE") && (
          <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
            <Chip
              label={config.chipLabel}
              size="small"
              color={config.chipColor}
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        )}

        {commande.commentaire_agent && (
          <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
            <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
              <CommentIcon fontSize="small" />
              Commentaire du traitant
            </Typography>
            <Box
              sx={{
                bgcolor: "#FAFAFA",
                p: 1.5,
                borderRadius: 1,
                border: "1px solid #E0E0E0",
              }}
            >
              <Typography variant="body2">{commande.commentaire_agent}</Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}