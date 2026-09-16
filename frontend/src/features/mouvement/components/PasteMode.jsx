import { Box, TextField, Button, Typography } from "@mui/material";
import { ContentPaste as PasteIcon } from "@mui/icons-material";

export function PasteMode({ pasteValue, onPasteValueChange, onSubmit }) {
  return (
    <Box>
      <Box sx={{ mb: 2, p: 1.5, bgcolor: "#FFF8E1", borderRadius: 1, border: "1px solid #F9A825" }}>
        <Typography variant="body2" fontWeight={600}>
          Collez votre liste de numéros de série ici.
        </Typography>
      </Box>
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