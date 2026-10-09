import { Box, Typography } from "@mui/material";
import {
  Person as PersonIcon,
  Event as EventIcon,
  Description as DescriptionIcon,
  AssignmentInd as AssignmentIndIcon,
  Comment as CommentIcon,
} from "@mui/icons-material";
import { EmptyValue } from "../../../components/common/EmptyValue";
import { formatDateTime } from "../../../utils/formatters";

const TRAITANT_LABEL = {
  EN_COURS: "Pré-validé par",
  VALIDEE: "Validé par",
  REJETEE: "Rejeté par",
};

function InfoTile({ icon, label, children }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        p: 1.5,
        border: "1px solid #E0E0E0",
        borderRadius: 1,
        bgcolor: "background.paper",
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          bgcolor: "tint.main",
          color: "primary.main",
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Box sx={{ fontWeight: 500, wordBreak: "break-word" }}>{children}</Box>
      </Box>
    </Box>
  );
}

export function CommandeInfoSection({ commande }) {
  const traitantNom = commande.traitant?.nom || commande.employe_traitant;
  const traitantLabel = TRAITANT_LABEL[commande.statut] || "Traitement";

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h3" sx={{ mb: 1.5 }}>
        Informations générales
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
          gap: 1.5,
        }}
      >
        <InfoTile icon={<DescriptionIcon fontSize="small" />} label="Objet">
          <Typography variant="body1" component="div" fontWeight={500}>
            <EmptyValue value={commande.objet} />
          </Typography>
        </InfoTile>

        <InfoTile icon={<PersonIcon fontSize="small" />} label="Demandeur">
          <Typography variant="body1" fontWeight={500}>
            {commande.demandeur?.nom || commande.employe_demandeur || "—"}
          </Typography>
        </InfoTile>

        <InfoTile icon={<EventIcon fontSize="small" />} label="Date de demande">
          <Typography variant="body1" fontWeight={500}>
            {formatDateTime(commande.date_commande)}
          </Typography>
        </InfoTile>

        <InfoTile icon={<AssignmentIndIcon fontSize="small" />} label={traitantLabel}>
          {traitantNom ? (
            <>
              <Typography variant="body1" fontWeight={500}>
                {traitantNom}
              </Typography>
              {commande.date_traitement && (
                <Typography variant="caption" color="text.secondary" component="div">
                  Le {formatDateTime(commande.date_traitement)}
                </Typography>
              )}
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {commande.statut === "EN_ATTENTE" ? "Pas encore traité" : "—"}
            </Typography>
          )}
        </InfoTile>
      </Box>

      {commande.commentaire_agent && (
        <Box
          sx={{
            mt: 1.5,
            p: 1.5,
            bgcolor: "tint.light",
            border: "1px solid #E0E0E0",
            borderLeft: "3px solid",
            borderLeftColor: "secondary.main",
            borderRadius: 1,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}
          >
            <CommentIcon fontSize="inherit" />
            Commentaire du traitant
          </Typography>
          <Typography variant="body2">{commande.commentaire_agent}</Typography>
        </Box>
      )}
    </Box>
  );
}
