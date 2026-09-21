import { Box, Typography, Chip, Divider } from "@mui/material";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  SwapHoriz as SwapHorizIcon,
} from "@mui/icons-material";
import { EtatBadge } from "../../../components/common/EtatBadge";

export function PropositionsSeriesDisplay({ propositions }) {
  if (!propositions || Object.keys(propositions).length === 0) {
    return null;
  }

  const ajouts = propositions.ajouts || [];
  const retraits = propositions.retraits || [];
  const changements = propositions.changements_etat || [];

  return (
    <Box sx={{ mt: 1, p: 1.5, bgcolor: "#FAFAFA", borderRadius: 1, border: "1px solid #E0E0E0" }}>
      <Typography variant="caption" fontWeight={600} sx={{ mb: 1, display: "block" }}>
        Propositions de numéros de série
      </Typography>

      {ajouts.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="success.main" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <AddIcon sx={{ fontSize: 14 }} />
            Ajouts ({ajouts.length})
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
            {ajouts.map((a, idx) => (
              <Chip
                key={idx}
                label={`${a.numero_serie} (${a.etat})`}
                size="small"
                color="success"
                variant="outlined"
                sx={{ height: 22, fontSize: 11 }}
              />
            ))}
          </Box>
        </Box>
      )}

      {retraits.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="error.main" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <RemoveIcon sx={{ fontSize: 14 }} />
            Retraits ({retraits.length})
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
            {retraits.map((r, idx) => (
              <Chip
                key={idx}
                label={`${r.numero_serie} → ${r.etat}`}
                size="small"
                color="error"
                variant="outlined"
                sx={{ height: 22, fontSize: 11 }}
              />
            ))}
          </Box>
        </Box>
      )}

      {changements.length > 0 && (
        <Box>
          <Typography variant="caption" color="warning.main" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <SwapHorizIcon sx={{ fontSize: 14 }} />
            Changements d'état ({changements.length})
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
            {changements.map((c, idx) => (
              <Chip
                key={idx}
                label={`${c.numero_serie} → ${c.etat}`}
                size="small"
                color="warning"
                variant="outlined"
                sx={{ height: 22, fontSize: 11 }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}