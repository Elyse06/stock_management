import { Box, Chip, Paper, Typography } from "@mui/material";
import { ArrowForward as ArrowForwardIcon } from "@mui/icons-material";

import { ResultTable } from "./ResultTable";
import { TexteFormate } from "./TexteFormate";

/** Bulle de conversation : texte, tableaux de résultats et liens vers les pages concernées. */
export function ChatMessage({ message, onNaviguer }) {
  const utilisateur = message.role === "user";
  return (
    <Box sx={{ display: "flex", justifyContent: utilisateur ? "flex-end" : "flex-start" }}>
      <Paper
        elevation={0}
        sx={{
          maxWidth: utilisateur ? "85%" : "100%",
          px: 1.5,
          py: 1,
          bgcolor: utilisateur ? "#FFC107" : "#FFFFFF",
          color: utilisateur ? "#000000" : "text.primary",
          border: utilisateur ? "none" : "1px solid #E0E0E0",
          borderRadius: 2,
          borderTopRightRadius: utilisateur ? 2 : 12,
          borderTopLeftRadius: utilisateur ? 12 : 2,
          minWidth: 0,
        }}
      >
        {utilisateur ? (
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", fontSize: 13, wordBreak: "break-word" }}>
            {message.content}
          </Typography>
        ) : (
          <TexteFormate texte={message.content} />
        )}
        {message.tableaux?.map((tableau, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <ResultTable key={i} tableau={tableau} onNaviguer={onNaviguer} />
        ))}
        {message.liens?.length > 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.25 }}>
            {message.liens.map((lien) => (
              <Chip
                key={lien.chemin}
                label={lien.libelle}
                size="small"
                clickable
                onClick={() => onNaviguer(lien.chemin)}
                onDelete={() => onNaviguer(lien.chemin)}
                deleteIcon={<ArrowForwardIcon />}
                sx={{ bgcolor: "tint.main", border: "1px solid", borderColor: "secondary.light", fontSize: 12 }}
              />
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
