import { useRef, useState } from "react";
import { Box, Typography, Button, Stack } from "@mui/material";
import { CloudUpload as CloudUploadIcon, Delete as DeleteIcon, InsertDriveFile as InsertDriveFileIcon } from "@mui/icons-material";

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

/** Zone de dépôt (glisser-déposer ou clic) d'un fichier à importer. */
export function FileDropZone({ fichier, onChoisir, disabled, extensions = [".xlsx", ".xls"] }) {
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

  return (
    <Box
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Sélectionner un fichier à importer"
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
        accept={extensions.join(",")}
        hidden
        onChange={handleChange}
        disabled={disabled}
      />

      {!fichier ? (
        <Stack spacing={1} alignItems="center">
          <CloudUploadIcon sx={{ fontSize: 48, color: "primary.main" }} />
          <Typography fontWeight={600}>
            Glissez-déposez votre fichier ici
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ou cliquez pour parcourir ({extensions.join(", ")} — max 10 Mo)
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