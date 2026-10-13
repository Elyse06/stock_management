import { Chip } from "@mui/material";

const PALETTES = {
  green: (n) => (n > 0 ? { bgcolor: "#E8F5E9", color: "#2E7D32" } : { bgcolor: "#FAFAFA", color: "#9E9E9E" }),
  blue: () => ({ bgcolor: "#E1F5FE", color: "#0288D1" }),
  purple: () => ({ bgcolor: "#F3E5F5", color: "#7B1FA2" }),
};

/** Compteur (effectif, nombre de services...) sous forme de pastille. */
export function CountChip({ value, palette = "green" }) {
  const nombre = Number(value) || 0;
  return <Chip label={nombre} size="small" sx={{ fontWeight: 600, ...PALETTES[palette](nombre) }} />;
}

