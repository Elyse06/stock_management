import { useState } from "react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { Check as CheckIcon, ContentCopy as CopyIcon } from "@mui/icons-material";

import { BLEU, GRIS } from "../constants/style";

const heureDe = (date) => (date instanceof Date ? date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "");

/** Sous une réponse : heure et bouton pour copier le texte. */
export function ActionsReponse({ message }) {
  const [copie, setCopie] = useState(false);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopie(true);
      setTimeout(() => setCopie(false), 1500);
    } catch {
      // Presse-papiers indisponible : rien à faire.
    }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, mt: 0.5 }}>
      <Typography sx={{ fontSize: 11, color: GRIS, mr: 0.5 }}>{heureDe(message.heure)}</Typography>
      <Tooltip title={copie ? "Copié" : "Copier la réponse"}>
        <IconButton size="small" onClick={copier} aria-label="Copier la réponse" sx={{ p: 0.5, color: GRIS, "&:hover": { color: BLEU } }}>
          {copie ? <CheckIcon sx={{ fontSize: 15, color: "success.main" }} /> : <CopyIcon sx={{ fontSize: 14 }} />}
        </IconButton>
      </Tooltip>
    </Box>
  );
}
