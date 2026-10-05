import { Box, Typography, Grid } from "@mui/material";
import { Store as StoreIcon, Business as BusinessIcon, CalendarToday as CalendarIcon, CheckCircle as CheckCircleIcon, Assignment as AssignmentIcon, MeetingRoom as MeetingRoomIcon, LocationCity as LocationCityIcon } from "@mui/icons-material";
import { StatusChip } from "../../../components/common/StatusChip";
import { formatDateTime } from "../../../utils/formatters";

export function InventaireInfoSection({ session }) {
  const LieuIcon = session.magasin
    ? StoreIcon
    : session.salle
      ? MeetingRoomIcon
      : session.site
        ? LocationCityIcon
        : BusinessIcon;
  const lieuType = session.magasin
    ? "Magasin"
    : session.salle
      ? "Salle"
      : session.site
        ? "Site"
        : "Direction";

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h3" sx={{ mb: 1.5 }}>Informations générales</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <LieuIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">{lieuType}</Typography>
          </Box>
          <Typography variant="body1" fontWeight={500}>{session.lieu_nom || "—"}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <AssignmentIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">Statut</Typography>
          </Box>
          <StatusChip status={session.statut} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <CalendarIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">Date de création</Typography>
          </Box>
          <Typography variant="body1">{formatDateTime(session.date_creation)}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <CheckCircleIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">Date de validation</Typography>
          </Box>
          <Typography variant="body1">{session.date_validation ? formatDateTime(session.date_validation) : "—"}</Typography>
        </Grid>
      </Grid>
    </Box>
  );
}