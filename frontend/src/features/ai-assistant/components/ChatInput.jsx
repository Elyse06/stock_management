import { useEffect, useRef, useState } from "react";
import { Box, IconButton, InputBase, Tooltip, Typography } from "@mui/material";
import { ArrowUpward as EnvoyerIcon, Stop as ArreterIcon } from "@mui/icons-material";

import { MAX_LONGUEUR_MESSAGE } from "../api/aiApi";
import { BLEU, BLEU_FONCE, BORDURE, GRIS, TEXTE } from "../constants/style";

/** Zone de saisie : Entrée envoie, Maj+Entrée va à la ligne ; pendant une réponse, le bouton l'arrête. */
export function ChatInput({ loading, onSend, onStop, focus }) {
  const [texte, setTexte] = useState("");
  const champRef = useRef(null);
  const pret = Boolean(texte.trim()) && !loading;

  // Le curseur revient dans le champ à l'ouverture du panneau et après chaque réponse.
  useEffect(() => {
    if (focus && !loading) champRef.current?.focus();
  }, [focus, loading]);

  const envoyer = () => {
    if (!pret) return;
    onSend(texte);
    setTexte("");
  };

  return (
    <Box sx={{ px: 2, pt: 1.25, pb: 1, bgcolor: "#FFFFFF", borderTop: `1px solid ${BORDURE}` }}>
      <Box
        sx={{
          display: "flex", alignItems: "flex-end", gap: 1, pl: 1.75, pr: 0.75, py: 0.75,
          border: `1px solid #D0D5DD`, borderRadius: 3.5, bgcolor: "#FFFFFF", transition: "border-color .15s, box-shadow .15s",
          "&:focus-within": { borderColor: BLEU, boxShadow: "0 0 0 3px rgba(1,80,155,0.12)" },
        }}
      >
        <InputBase
          inputRef={champRef}
          fullWidth
          multiline
          maxRows={5}
          placeholder="Posez votre question…"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              envoyer();
            }
          }}
          slotProps={{ input: { maxLength: MAX_LONGUEUR_MESSAGE, "aria-label": "Message à l'assistant" } }}
          sx={{ fontSize: 14, color: TEXTE, py: 0.5 }}
        />
        {loading ? (
          <Tooltip title="Arrêter la réponse">
            <IconButton onClick={onStop} aria-label="Arrêter la réponse"
              sx={{ width: 34, height: 34, bgcolor: TEXTE, color: "#FFFFFF", "&:hover": { bgcolor: "#344054" } }}>
              <ArreterIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        ) : (
          <IconButton onClick={envoyer} disabled={!pret} aria-label="Envoyer"
            sx={{
              width: 34, height: 34, bgcolor: BLEU, color: "#FFFFFF", "&:hover": { bgcolor: BLEU_FONCE },
              "&.Mui-disabled": { bgcolor: "#EAECF0", color: "#98A2B3" },
            }}>
            <EnvoyerIcon sx={{ fontSize: 19 }} />
          </IconButton>
        )}
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mt: 0.75, px: 0.5 }}>
        <Typography sx={{ fontSize: 11, color: GRIS }}>
          Réponses limitées aux données que vous pouvez consulter. Vérifiez les chiffres importants.
        </Typography>
        {texte.length > MAX_LONGUEUR_MESSAGE * 0.9 && (
          <Typography sx={{ fontSize: 11, color: GRIS, flexShrink: 0 }}>
            {texte.length}/{MAX_LONGUEUR_MESSAGE}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
