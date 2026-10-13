import { Box, TextField, Button, Alert } from "@mui/material";
import { ContentPaste as PasteIcon } from "@mui/icons-material";

export function PasteMode({ pasteValue, onPasteValueChange, onSubmit }) {
  return (
    <Box>
      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        Collez votre liste de numéros de série (un par ligne, ou séparés par une virgule).
      </Alert>
      <TextField
        label="Collez votre liste ici"
        value={pasteValue}
        onChange={(e) => onPasteValueChange(e.target.value)}
        fullWidth
        multiline
        rows={8}
        InputProps={{
          sx: { fontFamily: "monospace" },
        }}
      />
      <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={!pasteValue.trim()}
          startIcon={<PasteIcon />}
        >
          Ajouter à la liste
        </Button>
      </Box>
    </Box>
  );
}