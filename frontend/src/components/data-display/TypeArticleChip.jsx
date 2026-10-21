import { Chip } from "@mui/material";

/** Pastille « Immobilisation » (bleu) ou « Fourniture » (jaune). */
export function TypeArticleChip({ immobilisation, size = "small" }) {
  return immobilisation ? (
    <Chip size={size} label="Immobilisation" variant="outlined" color="primary" />
  ) : (
    <Chip size={size} label="Fourniture" variant="outlined" sx={{ borderColor: "secondary.dark", color: "#8A5A00" }} />
  );
}
