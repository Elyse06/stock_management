import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Box, CircularProgress, Drawer, IconButton, Paper, Typography } from "@mui/material";
import { AutoAwesome as MagicIcon, Close as CloseIcon, DeleteSweep as ClearIcon } from "@mui/icons-material";

import { usePermission } from "@/features/auth/hooks/usePermission";

import { useAIChat } from "../hooks/useAIChat";
import { suggestionsPour } from "../utils/suggestions";

import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";

const LARGEUR = 460;

/** Panneau latéral de l'assistant. ``question`` (``{texte, id}``) est posée automatiquement à l'ouverture. */
export function AIChatDrawer({ open, onClose, question }) {
  const navigate = useNavigate();
  const droits = usePermission();
  const chat = useAIChat();
  const finRef = useRef(null);
  const derniereQuestion = useRef(null);
  const suggestions = useMemo(() => suggestionsPour(droits), [droits]);
  const { envoyer } = chat;

  useEffect(() => {
    if (open && question && question.id !== derniereQuestion.current) {
      derniereQuestion.current = question.id;
      envoyer(question.texte);
    }
  }, [open, question, envoyer]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages, chat.loading]);

  const naviguer = (chemin) => {
    navigate(chemin);
    onClose();
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} sx={{ "& .MuiDrawer-paper": { width: { xs: "100%", sm: LARGEUR }, borderLeft: "1px solid #E0E0E0" } }}>
      <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #E0E0E0", bgcolor: "#FFFDE7" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ width: 32, height: 32, bgcolor: "#FFC107", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MagicIcon sx={{ color: "#FFFFFF", fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={600}>
              Assistant IA
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Données et aide à la navigation
            </Typography>
          </Box>
        </Box>
        <Box>
          <IconButton size="small" onClick={chat.reinitialiser} aria-label="Réinitialiser la conversation" title="Réinitialiser">
            <ClearIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onClose} aria-label="Fermer" title="Fermer">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Box role="log" aria-live="polite" sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1.5, bgcolor: "#FAFAFA" }}>
        {chat.messages.map((message, index) => (
          <ChatMessage key={message.id} message={message} onNaviguer={naviguer}
            onChoix={chat.loading ? undefined : envoyer} dernier={index === chat.messages.length - 1} />
        ))}
        {chat.loading && (
          <Paper elevation={0} sx={{ alignSelf: "flex-start", px: 1.5, py: 1, border: "1px solid #E0E0E0", borderRadius: 2, display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={14} />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
              L'IA réfléchit...
            </Typography>
          </Paper>
        )}
        <div ref={finRef} />
      </Box>

      <ChatInput loading={chat.loading} onSend={chat.envoyer} suggestions={chat.estNouvelle ? suggestions : []} />
    </Drawer>
  );
}
