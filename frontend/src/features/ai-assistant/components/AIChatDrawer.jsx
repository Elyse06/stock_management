import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Drawer, IconButton, Tooltip, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  AutoAwesome as MagicIcon,
  Close as CloseIcon,
  CloseFullscreen as ReduireIcon,
  EditNote as NouvelleIcon,
  OpenInFull as ElargirIcon,
} from "@mui/icons-material";

import { useAuth } from "@/features/auth/context/AuthContext";
import { usePermission } from "@/features/auth/hooks/usePermission";

import { BLEU, BLEU_FONCE, JAUNE, LARGEUR, LARGEUR_ELARGIE, TEINTE_CLAIRE } from "../constants/style";
import { useAIChat } from "../hooks/useAIChat";
import { suggestionsPour } from "../utils/suggestions";

import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { EcranAccueil } from "./EcranAccueil";

const CLE_ELARGI = "tahiry.assistant.elargi";

function lireElargi() {
  try {
    return localStorage.getItem(CLE_ELARGI) === "1";
  } catch {
    return false;
  }
}

function BoutonEntete({ titre, onClick, children }) {
  return (
    <Tooltip title={titre}>
      <IconButton size="small" onClick={onClick} aria-label={titre}
        sx={{ color: "rgba(255,255,255,0.85)", "&:hover": { color: "#FFFFFF", bgcolor: "rgba(255,255,255,0.12)" } }}>
        {children}
      </IconButton>
    </Tooltip>
  );
}

/** Panneau latéral de l'assistant. ``question`` (``{texte, id}``) est posée automatiquement à l'ouverture. */
export function AIChatDrawer({ open, onClose, question }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const ecranLarge = useMediaQuery(theme.breakpoints.up("md"));
  const { user } = useAuth();
  const droits = usePermission();
  const chat = useAIChat();
  const zoneRef = useRef(null);
  const colleEnBas = useRef(true);
  const derniereQuestion = useRef(null);
  const [elargi, setElargi] = useState(lireElargi);
  const suggestions = useMemo(() => suggestionsPour(droits), [droits]);
  const { envoyer } = chat;
  const large = elargi && ecranLarge;

  useEffect(() => {
    if (open && question && question.id !== derniereQuestion.current) {
      derniereQuestion.current = question.id;
      envoyer(question.texte);
    }
  }, [open, question, envoyer]);

  // Suit la réponse qui s'écrit, sauf si l'utilisateur est remonté lire plus haut.
  useLayoutEffect(() => {
    const zone = zoneRef.current;
    if (zone && colleEnBas.current) zone.scrollTop = zone.scrollHeight;
  }, [chat.messages]);

  const surDefilement = () => {
    const zone = zoneRef.current;
    if (zone) colleEnBas.current = zone.scrollHeight - zone.scrollTop - zone.clientHeight < 80;
  };

  const envoyerEnBas = (texte) => {
    colleEnBas.current = true;
    envoyer(texte);
  };

  const basculerLargeur = () => {
    setElargi((e) => {
      try {
        localStorage.setItem(CLE_ELARGI, e ? "0" : "1");
      } catch {
        // Stockage indisponible : la préférence ne vaut que pour cette session.
      }
      return !e;
    });
  };

  const naviguer = (chemin) => {
    navigate(chemin);
    onClose();
  };

  const nom = user?.employe?.emp_nom;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDrawer-paper": {
          width: { xs: "100%", sm: large ? LARGEUR_ELARGIE : LARGEUR },
          transition: "width .2s ease",
          border: "none",
          backgroundColor: TEINTE_CLAIRE,
          backgroundImage: "none",
          overflow: "hidden",
        },
      }}
    >
      <Box
        component="header"
        sx={{
          px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1.5, color: "#FFFFFF",
          background: `linear-gradient(135deg, ${BLEU} 0%, ${BLEU_FONCE} 100%)`, borderBottom: `3px solid ${JAUNE}`,
        }}
      >
        <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: JAUNE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <MagicIcon sx={{ color: BLEU, fontSize: 21 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>Assistant Tahiry</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          {ecranLarge && (
            <BoutonEntete titre={large ? "Réduire le panneau" : "Agrandir le panneau"} onClick={basculerLargeur}>
              {large ? <ReduireIcon fontSize="small" /> : <ElargirIcon fontSize="small" />}
            </BoutonEntete>
          )}
          <BoutonEntete titre="Nouvelle conversation" onClick={chat.reinitialiser}>
            <NouvelleIcon fontSize="small" />
          </BoutonEntete>
          <BoutonEntete titre="Fermer" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </BoutonEntete>
        </Box>
      </Box>

      <Box
        ref={zoneRef}
        onScroll={surDefilement}
        role="log"
        aria-live="polite"
        aria-busy={chat.loading}
        sx={{ flex: 1, overflowY: "auto", px: 2, py: 2, display: "flex", flexDirection: "column", gap: 2 }}
      >
        {chat.estNouvelle ? (
          <EcranAccueil nom={nom} suggestions={suggestions} onChoisir={envoyerEnBas} />
        ) : (
          chat.messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              dernier={index === chat.messages.length - 1}
              onNaviguer={naviguer}
              onChoix={chat.loading ? undefined : envoyerEnBas}
              onReessayer={chat.reessayer}
              hauteurTableaux={large ? 420 : 260}
            />
          ))
        )}
      </Box>

      <ChatInput loading={chat.loading} onSend={envoyerEnBas} onStop={chat.arreter} focus={open} />
    </Drawer>
  );
}
