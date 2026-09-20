import { Box, Typography, Grid } from "@mui/material";
import { StatusChip } from "../../../components/common/StatusChip";
import { EmptyValue } from "../../../components/common/EmptyValue";
import { formatDateTime } from "../../../utils/formatters";

export function MouvementInfoSection({ mouvement }) {
  const isRetour = mouvement.type_mouvement === "RETOUR";

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h3" sx={{ mb: 1.5 }}>
        Informations générales
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="body2" color="text.secondary">Type</Typography>
          <StatusChip status={mouvement.type_mouvement} />
        </Grid>

        {/*  RETOUR : pas de source, mais destination */}
        {!isRetour && mouvement.magasin_source_nom && (
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">Source</Typography>
            <Typography variant="body1" fontWeight={500}>{mouvement.magasin_source_nom}</Typography>
          </Grid>
        )}

        {mouvement.magasin_destination_nom && (
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              {isRetour ? "Magasin destination (retour)" : "Destination"}
            </Typography>
            <Typography variant="body1" fontWeight={500}>{mouvement.magasin_destination_nom}</Typography>
          </Grid>
        )}

        <Grid item xs={12} sm={6}>
          <Typography variant="body2" color="text.secondary">Date</Typography>
          <Typography variant="body1">{formatDateTime(mouvement.date)}</Typography>
        </Grid>

        {mouvement.origine && (
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">Origine / Provenance</Typography>
            <Typography variant="body1">{mouvement.origine}</Typography>
          </Grid>
        )}

        {mouvement.motif && (
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">Motif</Typography>
            <Typography variant="body1">{mouvement.motif}</Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}