import { useRef, useState } from "react";
import { Box, Typography, Button, Stack } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import DeleteIcon from "@mui/icons-material/Delete";

export function FileUploadZone({ fichier, onChoisir, disabled }) {
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const f = e.dataTransfer.files?.[0];
    if (f) onChoisir(f);
  };

  const handleChange = (e) => {
    const f = e.target.files?.[0];
    if (f) onChoisir(f);
    e.target.value = "";
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <Box
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      sx={{
        border: "2px dashed",
        borderColor: isDragOver ? "primary.main" : "#E0E0E0",
        bgcolor: isDragOver ? "#FFF8E1" : "#FAFAFA",
        borderRadius: 1,
        p: 4,
        textAlign: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s",
        "&:hover": !disabled && {
          borderColor: "primary.main",
          bgcolor: "#FFFDE7",
        },
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        hidden
        onChange={handleChange}
        disabled={disabled}
      />

      {!fichier ? (
        <Stack spacing={1} alignItems="center">
          <CloudUploadIcon sx={{ fontSize: 48, color: "primary.main" }} />
          <Typography fontWeight={600}>
            Glissez-déposez votre fichier Excel ici
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ou cliquez pour parcourir (.xlsx, .xls — max 10 Mo)
          </Typography>
        </Stack>
      ) : (
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
          <InsertDriveFileIcon sx={{ fontSize: 32, color: "primary.main" }} />
          <Box sx={{ textAlign: "left" }}>
            <Typography fontWeight={600}>{fichier.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {formatSize(fichier.size)}
            </Typography>
          </Box>
          <Button
            size="small"
            color="inherit"
            startIcon={<DeleteIcon />}
            onClick={(e) => {
              e.stopPropagation();
              onChoisir(null);
            }}
            disabled={disabled}
            sx={{ ml: 2 }}
          >
            Retirer
          </Button>
        </Stack>
      )}
    </Box>
  );
}