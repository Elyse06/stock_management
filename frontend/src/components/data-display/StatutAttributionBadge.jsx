import { Chip } from "@mui/material";
import {
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";

const STATUT_CONFIG = {
  EN_ATTENTE: {
    label: "En attente",
    color: "warning",
    icon: <ScheduleIcon />,
    variant: "outlined",
  },
  VALIDEE: {
    label: "Validée",
    color: "success",
    icon: <CheckCircleIcon />,
  },
  REFUSEE: {
    label: "Refusée",
    color: "error",
    icon: <CancelIcon />,
  },
};

export function StatutAttributionBadge({ statut, size = "small", ...props }) {
  const config = STATUT_CONFIG[statut] || STATUT_CONFIG.EN_ATTENTE;

  return (
    <Chip
      icon={config.icon}
      label={config.label}
      color={config.color}
      size={size}
      variant={config.variant || "filled"}
      sx={{
        fontWeight: 500,
      }}
      {...props}
    />
  );
}