import { Chip } from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  RemoveCircle as RemoveCircleIcon,
  Error as ErrorIcon,
  Block as BlockIcon,
  ReportGmailerrorred as ReportIcon,
} from "@mui/icons-material";

const ETAT_CONFIG = {
  BON: {
    label: "Bon",
    color: "success",
    icon: <CheckCircleIcon />,
  },
  MOYEN: {
    label: "Moyen",
    color: "warning",
    icon: <RemoveCircleIcon />,
  },
  MAUVAIS: {
    label: "Mauvais",
    color: "error",
    icon: <ErrorIcon />,
  },
  HORS_USAGE: {
    label: "Hors usage",
    color: "default",
    icon: <BlockIcon />,
    sx: {
      bgcolor: "#757575",
      color: "white",
      "& .MuiChip-icon": { color: "white" },
    },
  },
  PERDU: {
    label: "Perdu",
    color: "error",
    icon: <ReportIcon />,
    variant: "outlined",
  },
};

export function EtatBadge({ etat, size = "small", ...props }) {
  const config = ETAT_CONFIG[etat] || ETAT_CONFIG.BON;

  return (
    <Chip
      icon={config.icon}
      label={config.label}
      color={config.color}
      size={size}
      variant={config.variant || "filled"}
      sx={{
        fontWeight: 500,
        ...(config.sx || {}),
      }}
      {...props}
    />
  );
}