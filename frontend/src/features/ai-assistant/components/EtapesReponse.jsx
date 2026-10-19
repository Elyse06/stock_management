import { useState } from "react";
import { Box, ButtonBase, CircularProgress, Collapse, Typography } from "@mui/material";
import { CheckCircle as FaitIcon, ExpandMore as OuvrirIcon, ManageSearch as RechercheIcon } from "@mui/icons-material";

import { BLEU, GRIS, TEXTE } from "../constants/style";

function Etape({ libelle, precision, enCours }) {
  return (
    <Box component="li" sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.25, minWidth: 0 }}>
      {enCours ? <CircularProgress size={13} thickness={5} sx={{ color: BLEU, mx: "1.5px" }} /> : <FaitIcon sx={{ fontSize: 16, color: BLEU }} />}
      <Typography sx={{ fontSize: 12.5, color: enCours ? TEXTE : GRIS, fontWeight: enCours ? 600 : 400, minWidth: 0 }} noWrap>
        {libelle}
        {precision && (
          <Box component="span" sx={{ ml: 0.75, fontFamily: "monospace", fontSize: 11.5, color: BLEU }}>
            {precision}
          </Box>
        )}
      </Typography>
    </Box>
  );
}

/**
 * Ce que fait l'assistant : pendant la réponse, chaque consultation de données apparaît
 * (la dernière en cours) ; une fois la réponse donnée, la liste se replie en une ligne.
 */
export function EtapesReponse({ etapes = [], enCours, redige }) {
  const [ouvert, setOuvert] = useState(false);

  if (enCours) {
    const liste = etapes.length ? etapes : [{ libelle: "Analyse de votre question" }];
    return (
      <Box component="ul" aria-live="polite" sx={{ listStyle: "none", m: 0, p: 0, mb: redige ? 1.25 : 0 }}>
        {liste.map((etape, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <Etape key={i} {...etape} enCours={!redige && i === liste.length - 1} />
        ))}
        {redige && etapes.length > 0 && <Etape libelle="Rédaction de la réponse" enCours={false} />}
      </Box>
    );
  }
  if (!etapes.length) return null;

  return (
    <Box sx={{ mb: 1 }}>
      <ButtonBase
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, borderRadius: 1, px: 0.5, ml: -0.5, color: GRIS, "&:hover": { color: BLEU } }}
      >
        <RechercheIcon sx={{ fontSize: 15 }} />
        <Typography sx={{ fontSize: 11.5, fontWeight: 500 }}>
          {etapes.length} consultation{etapes.length > 1 ? "s" : ""} des données
        </Typography>
        <OuvrirIcon sx={{ fontSize: 16, transition: "transform .2s", transform: ouvert ? "rotate(180deg)" : "none" }} />
      </ButtonBase>
      <Collapse in={ouvert}>
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, pt: 0.5 }}>
          {etapes.map((etape, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <Etape key={i} {...etape} enCours={false} />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}
