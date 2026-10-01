import { Chip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";

const STYLES = {
  OK: {
    label: "OK",
    icon: <CheckCircleIcon />,
    bgcolor: "#E8F5E9",
    color: "#1A7F37",
    border: "#C8E6C9",
  },
  ERREUR: {
    label: "Erreur",
    icon: <ErrorIcon />,
    bgcolor: "#FDECEA",
    color: "#C0392B",
    border: "#F5C6CB",
  },
  A_TRAITER: {
    label: "À traiter",
    bgcolor: "#FFF3E0",
    color: "#B8860B",
    border: "#FFE0B2",
  },
};

export function StatusChip({ statut }) {
  const style = STYLES[statut] || STYLES.ERREUR;
  return (
    <Chip
      label={style.label}
      size="small"
      icon={style.icon}
      sx={{
        fontWeight: 600,
        fontSize: 12,
        bgcolor: style.bgcolor,
        color: style.color,
        "& .MuiChip-icon": {
          color: style.color,
        },
        border: `1px solid ${style.border}`,
      }}
    />
  );
}