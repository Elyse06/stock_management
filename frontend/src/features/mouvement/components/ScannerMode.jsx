// src/features/mouvement/components/ScannerMode.jsx
import { useEffect, useRef } from "react";
import { Box, TextField, Alert } from "@mui/material";
import { QrCodeScanner as ScannerIcon } from "@mui/icons-material";

export function ScannerMode({ scanValue, onScanValueChange, onScanKeyDown }) {
  const scanInputRef = useRef(null);

  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        <strong>Mode Douchette :</strong> Scannez ou tapez un numéro de série puis appuyez sur{" "}
        <strong>Entrée</strong>.
      </Alert>
      <TextField
        inputRef={scanInputRef}
        label="Numéro de série (Entrée pour valider)"
        value={scanValue}
        onChange={(e) => onScanValueChange(e.target.value)}
        onKeyDown={onScanKeyDown}
        fullWidth
        autoFocus
        size="small"
        placeholder="Scannez ou tapez ici..."
        InputProps={{
          startAdornment: <ScannerIcon fontSize="small" sx={{ color: "text.secondary", mr: 1 }} />,
          sx: {
            fontFamily: "monospace",
            fontSize: 16,
            bgcolor: "#FFFDE7",
          },
        }}
      />
    </Box>
  );
}