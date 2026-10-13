import { useState } from "react";
import { Box, Chip, CircularProgress, IconButton, InputAdornment, TextField, Typography } from "@mui/material";
import { Send as SendIcon } from "@mui/icons-material";

import { MAX_LONGUEUR_MESSAGE } from "../api/aiApi";

const SUGGESTIONS = ["Articles avec stock < 5", "Ordinateurs portables", "Immobilisations en stock", "Top 5 catégories"];

/** Suggestions (conversation vierge) et zone de saisie. Entrée envoie, Maj+Entrée va à la ligne. */
export function ChatInput({ loading, onSend, afficherSuggestions }) {
  const [texte, setTexte] = useState("");
  const envoyer = () => {
    if (!texte.trim() || loading) return;
    onSend(texte);
    setTexte("");
  };

  return (
    <>
      {afficherSuggestions && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Suggestions :
          </Typography>
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
            {SUGGESTIONS.map((s) => (
              <Chip key={s} label={s} size="small" clickable onClick={() => setTexte(s)} sx={{ bgcolor: "#FFFDE7", border: "1px solid #FFE082", fontSize: 11 }} />
            ))}
          </Box>
        </Box>
      )}
      <Box sx={{ p: 2, borderTop: "1px solid #E0E0E0" }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          size="small"
          placeholder="Posez votre question..."
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              envoyer();
            }
          }}
          disabled={loading}
          helperText={texte.length > MAX_LONGUEUR_MESSAGE * 0.9 ? `${texte.length}/${MAX_LONGUEUR_MESSAGE}` : undefined}
          slotProps={{
            htmlInput: { maxLength: MAX_LONGUEUR_MESSAGE, "aria-label": "Message à l'assistant" },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={envoyer}
                    size="small"
                    disabled={!texte.trim() || loading}
                    aria-label="Envoyer"
                    sx={{ bgcolor: texte.trim() ? "#FFC107" : "#F5F5F5", color: texte.trim() ? "#000000" : "#BDBDBD", "&:hover": { bgcolor: "#FFB300" } }}
                  >
                    {loading ? <CircularProgress size={16} /> : <SendIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#FAFAFA", borderRadius: 2 } }}
        />
      </Box>
    </>
  );
}
