import { Box, ButtonBase, Typography } from "@mui/material";

import { BLEU, BORDURE, GRIS, OMBRE_CARTE, TEINTE, TEXTE } from "../constants/style";

import { AvatarAssistant } from "./ChatMessage";

export function EcranAccueil({ nom, suggestions, onChoisir }) {
  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", px: 1, py: 2 }}>
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", mb: 3 }}>
        <AvatarAssistant taille={52} />
        <Typography sx={{ mt: 2, fontSize: 19, fontWeight: 700, color: TEXTE }}>
          {nom ? `Bonjour ${nom}` : "Bonjour"}
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: 13.5, color: GRIS, maxWidth: 340, lineHeight: 1.55 }}>
          Posez une question sur le stock, les commandes ou les mouvements.
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: GRIS, textTransform: "uppercase", letterSpacing: 0.4, mb: 1, px: 0.25 }}>
        Pour commencer
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 1 }}>
        {suggestions.map(({ texte, Icon }) => (
          <ButtonBase
            key={texte}
            onClick={() => onChoisir(texte)}
            sx={{
              justifyContent: "flex-start", alignItems: "flex-start", gap: 1.25, textAlign: "left", p: 1.5,
              bgcolor: "#FFFFFF", border: `1px solid ${BORDURE}`, borderRadius: 2.5, boxShadow: OMBRE_CARTE,
              transition: "border-color .15s, transform .15s",
              "&:hover, &:focus-visible": { borderColor: BLEU, transform: "translateY(-1px)" },
            }}
          >
            <Box sx={{ width: 28, height: 28, flexShrink: 0, borderRadius: 1.5, bgcolor: TEINTE, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon sx={{ fontSize: 17, color: BLEU }} />
            </Box>
            <Typography sx={{ fontSize: 13, color: TEXTE, lineHeight: 1.45, pt: 0.25 }}>{texte}</Typography>
          </ButtonBase>
        ))}
      </Box>
    </Box>
  );
}
