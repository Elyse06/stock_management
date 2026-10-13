import { Box, Typography } from "@mui/material";
import {
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
} from "@mui/icons-material";
import { StatusChip } from "@/components/data-display/StatusChip";
import { InfoTile } from "@/components/data-display/InfoTile";
import { formatDateTime } from "@/utils/formatters";
import { getLieuMeta } from "../utils/lieuMeta";

export function InventaireInfoSection({ session }) {
  const { Icon: LieuIcon, label: lieuType } = getLieuMeta(session);

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
        <InfoTile icon={<LieuIcon fontSize="small" />} label={lieuType}>
          <Typography variant="body1" fontWeight={500}>
            {session.lieu_nom || "—"}
          </Typography>
        </InfoTile>

        <InfoTile icon={<AssignmentIcon fontSize="small" />} label="Statut">
          <Box sx={{ mt: 0.25 }}>
            <StatusChip status={session.statut} />
          </Box>
        </InfoTile>

        <InfoTile icon={<CalendarIcon fontSize="small" />} label="Date de création">
          <Typography variant="body1" fontWeight={500}>
            {formatDateTime(session.date_creation)}
          </Typography>
        </InfoTile>

        <InfoTile icon={<CheckCircleIcon fontSize="small" />} label="Date de validation">
          <Typography variant="body1" fontWeight={500}>
            {session.date_validation ? formatDateTime(session.date_validation) : "—"}
          </Typography>
        </InfoTile>
      </Box>
    </Box>
  );
}
