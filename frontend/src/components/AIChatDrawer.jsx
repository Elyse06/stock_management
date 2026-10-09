// src/components/common/AIChatDrawer.jsx
import { useState, useRef, useEffect } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  Paper,
  Slide,
  Divider,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from "@mui/material";
import {
  Close as CloseIcon,
  Send as SendIcon,
  AutoAwesome as MagicIcon,
  DeleteSweep as ClearIcon,
  Search as SearchIcon,
  OpenInNew as OpenIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { aiChat } from "../utils/aiService";

const DRAWER_WIDTH = 420;

export function AIChatDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Bonjour ! 👋 Je suis votre assistant IA. Je peux vous aider à rechercher des articles, analyser le stock, et répondre à vos questions. Essayez par exemple : *'Articles avec stock < 5'* ou *'Ordinateurs Dell'*",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    const newMessages = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const history = newMessages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content }));

      const data = await aiChat(userMessage, history.slice(0, -1));

      // Ajouter la réponse de l'IA
      const assistantMessage = {
        role: "assistant",
        content: data.reply,
        searchResults: data.search_results || null,
      };

      setMessages([...newMessages, assistantMessage]);
    } catch (err) {
      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.details ||
        "Désolé, une erreur est survenue.";
      setMessages([
        ...newMessages,
        { role: "assistant", content: `⚠️ ${errorMsg}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: "assistant",
        content: "Conversation réinitialisée. Comment puis-je vous aider ?",
      },
    ]);
  };

  const handleViewAllArticles = (searchResults) => {
    // Naviguer vers la page articles avec les filtres appliqués
    // On peut passer les filtres via l'état de navigation ou URL params
    navigate("/catalogue/articles", {
      state: { aiFilters: searchResults.filters_applied },
    });
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDrawer-paper": {
          width: DRAWER_WIDTH,
          bgcolor: "#FFFFFF",
          borderLeft: "1px solid #E0E0E0",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #E0E0E0",
          bgcolor: "#FFFDE7",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              bgcolor: "#FFC107",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MagicIcon sx={{ color: "#FFFFFF", fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={600}>
              Assistant IA
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Recherche intelligente
            </Typography>
          </Box>
        </Box>
        <Box>
          <IconButton size="small" onClick={handleClear} title="Réinitialiser">
            <ClearIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onClose} title="Fermer">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Zone des messages */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          bgcolor: "#FAFAFA",
        }}
      >
        {messages.map((msg, idx) => (
          <Slide key={idx} direction="up" in={true} timeout={300}>
            <Box
              sx={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  maxWidth: "90%",
                  px: 1.5,
                  py: 1,
                  bgcolor: msg.role === "user" ? "#FFC107" : "#FFFFFF",
                  color: msg.role === "user" ? "#000000" : "text.primary",
                  border: msg.role === "user" ? "none" : "1px solid #E0E0E0",
                  borderRadius: 2,
                  borderTopRightRadius: msg.role === "user" ? 2 : 12,
                  borderTopLeftRadius: msg.role === "user" ? 12 : 2,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: "pre-wrap",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {msg.content}
                </Typography>

                {/* Affichage des résultats de recherche */}
                {msg.searchResults && msg.searchResults.count > 0 && (
                  <Box sx={{ mt: 1.5 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        mb: 1,
                      }}
                    >
                      <SearchIcon sx={{ fontSize: 14, color: "#FFC107" }} />
                      <Typography variant="caption" fontWeight={600}>
                        {msg.searchResults.count} article(s) trouvé(s)
                      </Typography>
                    </Box>

                    {/* Chips des filtres appliqués */}
                    {Object.keys(msg.searchResults.filters_applied || {})
                      .length > 0 && (
                      <Box
                        sx={{
                          display: "flex",
                          gap: 0.5,
                          flexWrap: "wrap",
                          mb: 1,
                        }}
                      >
                        {Object.entries(msg.searchResults.filters_applied).map(
                          ([key, value]) => (
                            <Chip
                              key={key}
                              label={`${key}: ${value}`}
                              size="small"
                              sx={{
                                bgcolor: "#FFF8E1",
                                border: "1px solid #FFE082",
                                fontSize: 10,
                                height: 20,
                              }}
                            />
                          )
                        )}
                      </Box>
                    )}

                    {/* Mini-tableau des 3 premiers articles */}
                    <TableContainer
                      sx={{
                        maxHeight: 150,
                        bgcolor: "#FAFAFA",
                        borderRadius: 1,
                        border: "1px solid #E0E0E0",
                      }}
                    >
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell
                              sx={{
                                fontSize: 10,
                                fontWeight: 600,
                                bgcolor: "#FFF8E1",
                                py: 0.5,
                              }}
                            >
                              Code
                            </TableCell>
                            <TableCell
                              sx={{
                                fontSize: 10,
                                fontWeight: 600,
                                bgcolor: "#FFF8E1",
                                py: 0.5,
                              }}
                            >
                              Désignation
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                fontSize: 10,
                                fontWeight: 600,
                                bgcolor: "#FFF8E1",
                                py: 0.5,
                              }}
                            >
                              Stock
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {msg.searchResults.articles.slice(0, 3).map((art) => (
                            <TableRow key={art.code_article}>
                              <TableCell sx={{ fontSize: 10, py: 0.3 }}>
                                {art.code_article}
                              </TableCell>
                              <TableCell sx={{ fontSize: 10, py: 0.3 }}>
                                {art.designation}
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{ fontSize: 10, py: 0.3 }}
                              >
                                {art.stock_calcule}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Bouton "Voir tous" */}
                    {msg.searchResults.count > 3 && (
                      <Button
                        size="small"
                        onClick={() => handleViewAllArticles(msg.searchResults)}
                        endIcon={<OpenIcon fontSize="small" />}
                        sx={{
                          mt: 1,
                          textTransform: "none",
                          fontSize: 11,
                          color: "#FFC107",
                          "&:hover": { bgcolor: "#FFF8E1" },
                        }}
                      >
                        Voir les {msg.searchResults.count} articles
                      </Button>
                    )}
                  </Box>
                )}
              </Paper>
            </Box>
          </Slide>
        ))}

        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
            <Paper
              elevation={0}
              sx={{
                px: 1.5,
                py: 1,
                bgcolor: "#FFFFFF",
                border: "1px solid #E0E0E0",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <CircularProgress size={14} sx={{ color: "#FFC107" }} />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: 13 }}
              >
                L'IA réfléchit...
              </Typography>
            </Paper>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Suggestions rapides */}
      {messages.length <= 1 && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Suggestions :
          </Typography>
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
            {[
              "Articles avec stock < 5",
              "Ordinateurs portables",
              "Immobilisations en stock",
              "Top 5 catégories",
            ].map((suggestion) => (
              <Paper
                key={suggestion}
                elevation={0}
                onClick={() => setInput(suggestion)}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  bgcolor: "#FFFDE7",
                  border: "1px solid #FFE082",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 11,
                  "&:hover": { bgcolor: "#FFF9C4" },
                }}
              >
                <Typography variant="caption">{suggestion}</Typography>
              </Paper>
            ))}
          </Box>
        </Box>
      )}

      <Divider />

      {/* Input */}
      <Box sx={{ p: 2, bgcolor: "#FFFFFF" }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          size="small"
          placeholder="Posez votre question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleSend}
                  size="small"
                  disabled={!input.trim() || isLoading}
                  sx={{
                    bgcolor: input.trim() ? "#FFC107" : "#F5F5F5",
                    color: input.trim() ? "#000000" : "#BDBDBD",
                    "&:hover": { bgcolor: "#FFB300" },
                  }}
                >
                  {isLoading ? (
                    <CircularProgress size={16} />
                  ) : (
                    <SendIcon fontSize="small" />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              bgcolor: "#FAFAFA",
              borderRadius: 2,
              "& fieldset": { borderColor: "#E0E0E0" },
              "&:hover fieldset": { borderColor: "#FFC107" },
              "&.Mui-focused fieldset": { borderColor: "#FFC107" },
            },
          }}
        />
      </Box>
    </Drawer>
  );
}