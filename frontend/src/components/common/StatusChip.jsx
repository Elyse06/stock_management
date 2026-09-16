import { Chip } from "@mui/material";

const STATUS_COLORS = {
  // Commandes
  EN_ATTENTE: "warning",
  EN_COURS: "info",
  VALIDEE: "success",
  REJETEE: "error",
  VALIDE: "success",
  REJETE: "error",
  // Mouvements
  ENTREE: "success",
  SORTIE: "error",
  TRANSFERT: "info",
  AJUSTEMENT: "warning",
};

const STATUS_LABELS = {
  EN_ATTENTE: "En attente",
  EN_COURS: "En cours",
  VALIDEE: "Validée",
  REJETEE: "Rejetée",
  VALIDE: "Validé",
  REJETE: "Rejeté",
  ENTREE: "Entrée",
  SORTIE: "Sortie",
  TRANSFERT: "Transfert",
  AJUSTEMENT: "Ajustement",
};

export function StatusChip({ status, variant = "filled", size = "small" }) {
  const getCustomStyle = (statut) => {
    switch (statut) {
      case "EN_ATTENTE":
        return { borderColor: "#F9A825", color: "#F9A825" };
      case "VALIDEE":
      case "VALIDE":
      case "ENTREE":
        return { borderColor: "#F9A825", color: "#F9A825", bgcolor: "#FFF8E1" };
      case "REJETEE":
      case "REJETE":
      case "SORTIE":
        return { borderColor: "#D32F2F", color: "#D32F2F" };
      case "EN_COURS":
      case "TRANSFERT":
        return { borderColor: "#F9A825", color: "#F9A825" };
      case "AJUSTEMENT":
        return { borderColor: "#F9A825", color: "#F9A825" };
      default:
        return {};
    }
  };

  const customStyle = getCustomStyle(status);

  return (
    <Chip
      label={STATUS_LABELS[status] || status}
      size={size}
      variant="outlined"
      sx={{
        borderColor: customStyle.borderColor || "#E0E0E0",
        color: customStyle.color || "text.primary",
        bgcolor: customStyle.bgcolor || "transparent",
        fontWeight: 500,
      }}
    />
  );
}