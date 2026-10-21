import { Box, Button, Typography } from "@mui/material";
import {
  ArrowForward as ArrowForwardIcon,
  AutoAwesome as MagicIcon,
  ErrorOutlineOutlined as ErreurIcon,
  Refresh as ReessayerIcon,
} from "@mui/icons-material";

import { BLEU, BORDURE, GRIS, JAUNE, OMBRE_CARTE, TEINTE } from "../constants/style";

import { ActionsReponse } from "./ActionsReponse";
import { EtapesReponse } from "./EtapesReponse";
import { ResultTable } from "./ResultTable";
import { TexteFormate } from "./TexteFormate";

const heureDe = (date) => (date instanceof Date ? date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "");

/** Pastille de l'assistant à gauche de ses réponses. */
export function AvatarAssistant({ taille = 28 }) {
  return (
    <Box sx={{ width: taille, height: taille, flexShrink: 0, borderRadius: "50%", bgcolor: BLEU, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 0 2px ${JAUNE}` }}>
      <MagicIcon sx={{ color: JAUNE, fontSize: taille * 0.55 }} />
    </Box>
  );
}

function QuestionUtilisateur({ message }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", pl: 6 }}>
      <Box sx={{ bgcolor: BLEU, color: "#FFFFFF", px: 1.75, py: 1, borderRadius: "16px 16px 4px 16px", maxWidth: "100%", boxShadow: OMBRE_CARTE }}>
        <Typography sx={{ whiteSpace: "pre-wrap", fontSize: 13.5, lineHeight: 1.5, wordBreak: "break-word" }}>{message.content}</Typography>
      </Box>
      <Typography sx={{ fontSize: 11, color: GRIS, mt: 0.5 }}>{heureDe(message.heure)}</Typography>
    </Box>
  );
}

function Erreur({ message, onReessayer }) {
  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", p: 1.25, borderRadius: "4px 16px 16px 16px", border: "1px solid #FECDCA", bgcolor: "#FEF3F2" }}>
      <ErreurIcon sx={{ fontSize: 18, color: "#B42318", mt: 0.1 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, color: "#7A271A", lineHeight: 1.5 }}>{message.content}</Typography>
        {message.question && onReessayer && (
          <Button size="small" startIcon={<ReessayerIcon sx={{ fontSize: 16 }} />} onClick={() => onReessayer(message)}
            sx={{ mt: 0.5, ml: -0.75, fontSize: 12, color: "#B42318" }}>
            Réessayer
          </Button>
        )}
      </Box>
    </Box>
  );
}

/** Une réponse de l'assistant : étapes, texte (au fil de l'eau), tableaux, choix proposés, liens. */
function ReponseAssistant({ message, onNaviguer, onChoix, onReessayer, dernier, hauteurTableaux }) {
  const redige = Boolean(message.content);
  return (
    <Box sx={{ display: "flex", gap: 1.25, alignItems: "flex-start", pr: { xs: 0, sm: 2 } }}>
      <AvatarAssistant />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {message.erreur ? (
          <Erreur message={message} onReessayer={dernier ? onReessayer : undefined} />
        ) : (
          <Box sx={{ bgcolor: "#FFFFFF", border: `1px solid ${BORDURE}`, borderRadius: "4px 16px 16px 16px", px: 1.75, py: 1.25, boxShadow: OMBRE_CARTE }}>
            <EtapesReponse etapes={message.etapes} enCours={message.enCours} redige={redige} />
            {(redige || !message.enCours) && <TexteFormate texte={message.content} curseur={message.enCours} />}
            {message.interrompu && (
              <Typography sx={{ fontSize: 12, color: GRIS, fontStyle: "italic", mt: redige ? 0.75 : 0 }}>Réponse interrompue.</Typography>
            )}
            {message.tableaux?.map((tableau, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <ResultTable key={i} tableau={tableau} onNaviguer={onNaviguer} hauteurMax={hauteurTableaux} />
            ))}
            {/* Choix proposés (ex. lever une ambiguïté) : un clic envoie la question correspondante. */}
            {dernier && message.choix?.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Typography sx={{ fontSize: 11.5, color: GRIS, mb: 0.5 }}>Précisez :</Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                  {message.choix.map((c) => (
                    <Button key={c.message} size="small" variant="outlined" onClick={() => onChoix?.(c.message)} disabled={!onChoix}
                      sx={{ borderRadius: 999, fontSize: 12, py: 0.25, px: 1.25, borderColor: BORDURE, bgcolor: "#FFFFFF", "&:hover": { borderColor: BLEU, bgcolor: TEINTE } }}>
                      {c.libelle}
                    </Button>
                  ))}
                </Box>
              </Box>
            )}
            {message.liens?.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.5, pt: 1.25, borderTop: `1px dashed ${BORDURE}` }}>
                {message.liens.map((lien) => (
                  <Button key={lien.chemin} size="small" endIcon={<ArrowForwardIcon sx={{ fontSize: 15 }} />} onClick={() => onNaviguer(lien.chemin)}
                    sx={{ borderRadius: 999, fontSize: 12, fontWeight: 600, py: 0.25, px: 1.25, bgcolor: TEINTE, color: BLEU, "&:hover": { bgcolor: "#D6E4F3" } }}>
                    {lien.libelle}
                  </Button>
                ))}
              </Box>
            )}
          </Box>
        )}
        {!message.enCours && !message.erreur && message.content && <ActionsReponse message={message} />}
      </Box>
    </Box>
  );
}

export function ChatMessage({ message, ...props }) {
  return message.role === "user" ? <QuestionUtilisateur message={message} /> : <ReponseAssistant message={message} {...props} />;
}
