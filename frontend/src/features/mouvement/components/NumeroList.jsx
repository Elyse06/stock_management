import { Box, Typography, IconButton, Chip } from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";

export function NumeroList({ numeros, numerosExistant, onDelete }) {
  if (numeros.length === 0) return null;

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
        Numéros de série ({numeros.length})
      </Typography>
      <Box
        sx={{
          maxHeight: 200,
          overflow: "auto",
          border: "1px solid #E0E0E0",
          borderRadius: 1,
          p: 1,
          bgcolor: "#FFFFFF",
        }}
      >
        {numeros.map((numero, index) => {
          const estExistant = index < numerosExistant.length;
          const estDoublon = numeros.indexOf(numero) !== index;
          return (
            <Box
              key={index}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 0.5,
                mb: 0.5,
                borderRadius: 0.5,
                bgcolor: estDoublon
                  ? "#FFEBEE"
                  : estExistant
                  ? "#FFF8E1"
                  : "#E8F5E9",
                border: estDoublon
                  ? "1px solid #EF5350"
                  : "1px solid #E0E0E0",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {estDoublon ? (
                  <WarningIcon fontSize="small" color="error" />
                ) : (
                  <CheckCircleIcon fontSize="small" color="success" />
                )}
                <Typography
                  variant="body2"
                  fontFamily="monospace"
                  fontWeight={500}
                >
                  {numero}
                </Typography>
                {estExistant && (
                  <Chip
                    label="existant"
                    size="small"
                    sx={{ height: 18, fontSize: 10 }}
                  />
                )}
              </Box>
              {!estExistant && (
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onDelete(index)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}