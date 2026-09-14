import { Chip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";

export function StatusChip({ statut }) {
  const estOk = statut === "OK";
  return (
    <Chip
      label={estOk ? "OK" : "Erreur"}
      size="small"
      icon={estOk ? <CheckCircleIcon /> : <ErrorIcon />}
      sx={{
        fontWeight: 600,
        fontSize: 12,
        bgcolor: estOk ? "#E8F5E9" : "#FDECEA",
        color: estOk ? "#1A7F37" : "#C0392B",
        "& .MuiChip-icon": {
          color: estOk ? "#1A7F37" : "#C0392B",
        },
        border: `1px solid ${estOk ? "#C8E6C9" : "#F5C6CB"}`,
      }}
    />
  );
}