import { Chip } from "@mui/material";

const STATUS_LABELS = {
  EN_ATTENTE: "En attente",
  EN_COURS: "En cours",
  VALIDEE: "Validée",
  REJETEE: "Rejetée",
  VALIDE: "Validé",
  TRAITE: "Traité",
  REJETE: "Rejeté",
  ENTREE: "Entrée",
  RETOUR: "Retour au stock",
  SORTIE: "Sortie",
  TRANSFERT: "Transfert",
  AJUSTEMENT: "Ajustement",
};

export function StatusChip({ status, variant = "filled", size = "small" }) {
  // Palette alignée sur le logo : bleu = positif / actif, jaune-orangé = en attente, rouge = rejet
  const BLUE = { borderColor: "primary.main", color: "primary.main" };
  const BLUE_FILLED = { ...BLUE, bgcolor: "tint.main" };
  const PENDING = { borderColor: "secondary.dark", color: "warning.dark" };

  const getCustomStyle = (statut) => {
    switch (statut) {
      case "EN_ATTENTE":
        return PENDING;
      case "VALIDEE":
      case "VALIDE":
      case "TRAITE":
      case "ENTREE":
      case "RETOUR":
        return BLUE_FILLED;
      case "REJETEE":
      case "REJETE":
      case "SORTIE":
        return { borderColor: "error.main", color: "error.main" };
      case "EN_COURS":
      case "TRANSFERT":
      case "AJUSTEMENT":
        return BLUE;
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
        borderColor: customStyle.borderColor || "divider",
        color: customStyle.color || "text.primary",
        bgcolor: customStyle.bgcolor || "transparent",
        fontWeight: 500,
      }}
    />
  );
}