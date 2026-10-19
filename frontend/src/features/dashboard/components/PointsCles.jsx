import { Box, Button, Typography } from "@mui/material";
import { AutoAwesome as AutoAwesomeIcon } from "@mui/icons-material";

import { useAssistant } from "@/features/ai-assistant/context/assistantContext";

const PASTILLE = { critique: "#F04438", attention: "#FECA05", info: "#7FA8D6", ok: "#12B76A" };
const QUESTION = "Fais-moi une synthèse de l'état du stock et des points d'attention.";
const SUGGESTIONS = ["Quels articles réapprovisionner en priorité ?", "Résume les mouvements du mois."];

/** Points clés calculés à partir des données ; l'assistant (gestionnaires) permet d'approfondir. */
export function PointsCles({ points }) {
  const { ouvrir, disponible } = useAssistant();
  return (
    <Box
      sx={{
        height: "100%",
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        color: "#FFFFFF",
        background: "linear-gradient(145deg, #01509B 0%, #013C75 60%, #022B54 100%)",
        boxShadow: "0 8px 24px rgba(1,80,155,0.25)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box aria-hidden sx={{ position: "absolute", right: -40, top: -40, width: 160, height: 160, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(254,202,5,0.35), transparent 70%)" }} />
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, position: "relative" }}>
        <AutoAwesomeIcon sx={{ color: "#FECA05", fontSize: 20 }} />
        <Typography component="h2" sx={{ fontSize: 15, fontWeight: 700 }}>
          Points clés
        </Typography>
      </Box>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, flex: 1, position: "relative" }}>
        {points.map((point) => (
          <Box component="li" key={point.texte} sx={{ display: "flex", gap: 1.25, py: 1, borderBottom: "1px solid rgba(255,255,255,0.12)",
            "&:last-of-type": { borderBottom: 0 } }}>
            <Box sx={{ width: 8, height: 8, mt: 0.75, flexShrink: 0, borderRadius: "50%", bgcolor: PASTILLE[point.niveau] }} />
            <Typography sx={{ fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.92)" }}>{point.texte}</Typography>
          </Box>
        ))}
      </Box>
      {disponible && (
        <>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 2, position: "relative" }}>
            {SUGGESTIONS.map((suggestion) => (
              <Box key={suggestion} component="button" type="button" onClick={() => ouvrir(suggestion)}
                sx={{ font: "inherit", fontSize: 12, color: "#FFFFFF", cursor: "pointer", px: 1.25, py: 0.5, borderRadius: 10,
                  bgcolor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", textAlign: "left",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.18)" } }}>
                {suggestion}
              </Box>
            ))}
          </Box>
          <Button
            onClick={() => ouvrir(QUESTION)}
            startIcon={<AutoAwesomeIcon />}
            sx={{ mt: 2, alignSelf: "flex-start", textTransform: "none", fontWeight: 600, color: "#022B54", bgcolor: "#FECA05",
              borderRadius: 2, px: 2, "&:hover": { bgcolor: "#FFDD55" } }}
          >
            Analyser avec l'assistant
          </Button>
        </>
      )}
    </Box>
  );
}
