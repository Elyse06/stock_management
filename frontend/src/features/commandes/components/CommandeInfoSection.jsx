import { Box, Typography } from "@mui/material";
import { Person as PersonIcon } from "@mui/icons-material";
import { EmptyValue } from "../../../components/common/EmptyValue";
import { formatDateTime } from "../../../utils/formatters";

export function CommandeInfoSection({ commande }) {
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
        {commande.commentaire_agent && (
          <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
            <Typography variant="body2" color="text.secondary">
              Commentaire
            </Typography>
            <Box
              sx={{
                bgcolor: "#FAFAFA",
                p: 1.5,
                borderRadius: 1,
                border: "1px solid #E0E0E0",
              }}
            >
              <Typography variant="body2">
                {commande.commentaire_agent}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}