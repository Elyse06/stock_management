import { Box, Typography } from "@mui/material";

/** **gras**, *italique* et `code` -> éléments React (aucun HTML interprété : le texte vient du modèle). */
function enLigne(texte) {
  return texte.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g).map((morceau, i) => {
    if (morceau.startsWith("**") && morceau.endsWith("**") && morceau.length > 4) {
      // eslint-disable-next-line react/no-array-index-key
      return <strong key={i}>{morceau.slice(2, -2)}</strong>;
    }
    if (morceau.startsWith("`") && morceau.endsWith("`") && morceau.length > 2) {
      // eslint-disable-next-line react/no-array-index-key
      return <Box component="code" key={i} sx={{ fontFamily: "monospace", fontSize: 12, bgcolor: "#F2F4F7", px: 0.5, borderRadius: 0.5 }}>{morceau.slice(1, -1)}</Box>;
    }
    if (morceau.startsWith("*") && morceau.endsWith("*") && morceau.length > 2) {
      // eslint-disable-next-line react/no-array-index-key
      return <em key={i}>{morceau.slice(1, -1)}</em>;
    }
    return morceau;
  });
}

const PUCE = /^\s*(?:[-*•]|\d+[.)])\s+/;

/** Rendu sobre de la réponse : paragraphes, listes à puces ou numérotées, gras. */
export function TexteFormate({ texte }) {
  const blocs = [];
  for (const ligne of (texte || "").split("\n")) {
    // Un titre Markdown (« ## Résumé ») devient une ligne en gras.
    const titre = ligne.match(/^#{1,6}\s+(.*)$/);
    const propre = titre ? `**${titre[1].replace(/\*\*/g, "")}**` : ligne;
    if (!propre.trim()) continue;
    if (PUCE.test(propre)) {
      const dernier = blocs[blocs.length - 1];
      const element = propre.replace(PUCE, "");
      if (dernier?.type === "liste") dernier.elements.push(element);
      else blocs.push({ type: "liste", elements: [element] });
    } else {
      blocs.push({ type: "paragraphe", texte: propre });
    }
  }
  return (
    <Box sx={{ "& > * + *": { mt: 0.75 } }}>
      {blocs.map((bloc, i) =>
        bloc.type === "liste" ? (
          // eslint-disable-next-line react/no-array-index-key
          <Box component="ul" key={i} sx={{ m: 0, pl: 2.5 }}>
            {bloc.elements.map((element, j) => (
              // eslint-disable-next-line react/no-array-index-key
              <Typography component="li" variant="body2" key={j} sx={{ fontSize: 13, lineHeight: 1.5 }}>
                {enLigne(element)}
              </Typography>
            ))}
          </Box>
        ) : (
          // eslint-disable-next-line react/no-array-index-key
          <Typography key={i} variant="body2" sx={{ fontSize: 13, lineHeight: 1.5, wordBreak: "break-word" }}>
            {enLigne(bloc.texte)}
          </Typography>
        ),
      )}
    </Box>
  );
}
