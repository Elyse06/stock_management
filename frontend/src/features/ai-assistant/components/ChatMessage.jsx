import { Box, Paper, Typography } from "@mui/material";

import { SearchResultsPreview } from "./SearchResultsPreview";

/** Bulle de conversation. Le contenu est affiché comme texte brut (jamais interprété en HTML). */
export function ChatMessage({ message, onVoirTout }) {
  const utilisateur = message.role === "user";
  return (
    <Box sx={{ display: "flex", justifyContent: utilisateur ? "flex-end" : "flex-start" }}>
      <Paper
        elevation={0}
        sx={{
          maxWidth: "90%",
          px: 1.5,
          py: 1,
          bgcolor: utilisateur ? "#FFC107" : "#FFFFFF",
          color: utilisateur ? "#000000" : "text.primary",
          border: utilisateur ? "none" : "1px solid #E0E0E0",
          borderRadius: 2,
          borderTopRightRadius: utilisateur ? 2 : 12,
          borderTopLeftRadius: utilisateur ? 12 : 2,
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.5, wordBreak: "break-word" }}>
          {message.content}
        </Typography>
        {message.searchResults?.count > 0 && <SearchResultsPreview resultats={message.searchResults} onVoirTout={() => onVoirTout(message.searchResults)} />}
      </Paper>
    </Box>
  );
}
