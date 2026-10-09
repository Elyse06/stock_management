// src/components/common/SmartSearchBar.jsx
import { useState } from "react";
import {
  TextField,
  InputAdornment,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Chip,
  Paper,
  Slide,
} from "@mui/material";
import {
  AutoAwesome as MagicIcon,
  Close as CloseIcon,
  Send as SendIcon,
} from "@mui/icons-material";
import { aiSearchArticles } from "../../services/aiService";

export function SmartSearchBar({ onResults, onError }) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await aiSearchArticles(query);
      setLastResult(data);
      if (onResults) onResults(data);
    } catch (err) {
      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.details ||
        "Erreur lors de la recherche IA";
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const clearResult = () => {
    setLastResult(null);
    setError(null);
    setQuery("");
    if (onResults) onResults(null);
  };

  return (
    <Box sx={{ mb: 2 }}>
      {/* Barre de recherche IA */}
      <Paper
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: lastResult ? "#FFC107" : "#E0E0E0",
          borderRadius: "4px",
          bgcolor: "#FFFFFF",
          transition: "border-color 0.2s",
          "&:hover": { borderColor: "#FFC107" },
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="✨ Demandez à l'IA : 'Articles avec stock > 10', 'Ordinateurs Dell'..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    bgcolor: "#FFF8E1",
                    borderRadius: "4px",
                  }}
                >
                  <MagicIcon sx={{ color: "#FFC107", fontSize: 16 }} />
                </Box>
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {isLoading ? (
                  <CircularProgress size={18} sx={{ color: "#FFC107" }} />
                ) : (
                  <IconButton
                    onClick={handleSearch}
                    size="small"
                    disabled={!query.trim()}
                    sx={{
                      color: "#FFC107",
                      "&:hover": { bgcolor: "#FFF8E1" },
                    }}
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                )}
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-notchedOutline": { border: "none" },
            "& input": { py: 1.2, fontSize: 14 },
          }}
        />
      </Paper>

      {/* Bandeau de résultat IA */}
      {lastResult && (
        <Slide direction="down" in={!!lastResult} mountOnEnter unmountOnExit>
          <Paper
            elevation={0}
            sx={{
              mt: 1,
              p: 1.5,
              bgcolor: "#FFFDE7",
              border: "1px solid #FFE082",
              borderRadius: "4px",
              display: "flex",
              alignItems: "flex-start",
              gap: 1,
            }}
          >
            <MagicIcon sx={{ color: "#FFC107", fontSize: 18, mt: 0.2 }} />
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="body2"
                sx={{ color: "#5D4037", fontWeight: 500 }}
              >
                {lastResult.ai_message}
              </Typography>
              {Object.keys(lastResult.filters_applied || {}).length > 0 && (
                <Box sx={{ mt: 1, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                  {Object.entries(lastResult.filters_applied).map(([key, value]) => (
                    <Chip
                      key={key}
                      label={`${key}: ${value}`}
                      size="small"
                      sx={{
                        bgcolor: "#FFFFFF",
                        border: "1px solid #FFE082",
                        fontSize: 11,
                        height: 22,
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
            <IconButton
              size="small"
              onClick={clearResult}
              sx={{ color: "#9E9E9E" }}
              title="Réinitialiser la recherche IA"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Paper>
        </Slide>
      )}

      {/* Bandeau d'erreur */}
      {error && (
        <Paper
          elevation={0}
          sx={{
            mt: 1,
            p: 1.5,
            bgcolor: "#FFF3E0",
            border: "1px solid #FFB74D",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <MagicIcon sx={{ color: "#E65100", fontSize: 18 }} />
          <Typography variant="body2" sx={{ color: "#E65100", flex: 1 }}>
            {error}
          </Typography>
          <IconButton
            size="small"
            onClick={() => setError(null)}
            sx={{ color: "#E65100" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Paper>
      )}
    </Box>
  );
}