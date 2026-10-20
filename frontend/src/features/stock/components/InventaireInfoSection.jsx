import { Box, Typography } from "@mui/material";
import {
  CalendarToday as CalendarIcon,
  Category as TypeIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  VerifiedUser as ValideurIcon,
} from "@mui/icons-material";
import { StatusChip } from "@/components/data-display/StatusChip";
import { InfoTile } from "@/components/data-display/InfoTile";
import { formatDateTime } from "@/utils/formatters";
import { libelleTypeSession } from "../constants/typeInventaire";
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

        <InfoTile icon={<TypeIcon fontSize="small" />} label="Articles inventoriés">
          <Typography variant="body1" fontWeight={500}>{libelleTypeSession(session.type_articles)}</Typography>
        </InfoTile>

        <InfoTile icon={<PersonIcon fontSize="small" />} label="Réalisé par">
          <Typography variant="body1" fontWeight={500}>{session.realise_par_nom || "—"}</Typography>
        </InfoTile>

        <InfoTile icon={<ValideurIcon fontSize="small" />} label="Validé par">
          <Typography variant="body1" fontWeight={500}>{session.valide_par_nom || "—"}</Typography>
        </InfoTile>
      </Box>
    </Box>
  );
}
