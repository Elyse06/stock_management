import { Box, Typography } from "@mui/material";

import { BLEU, BORDURE, JAUNE, TEINTE, TEXTE } from "../constants/style";

/** **gras**, *italique* et `code` -> éléments React (aucun HTML interprété : le texte vient du modèle). */
function enLigne(texte) {
  return texte.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g).map((morceau, i) => {
    if (morceau.startsWith("**") && morceau.endsWith("**") && morceau.length > 4) {
      // eslint-disable-next-line react/no-array-index-key
      return <Box component="strong" key={i} sx={{ fontWeight: 700, color: TEXTE }}>{morceau.slice(2, -2)}</Box>;
    }
    if (morceau.startsWith("`") && morceau.endsWith("`") && morceau.length > 2) {
      return (
        // eslint-disable-next-line react/no-array-index-key
        <Box component="code" key={i} sx={{ fontFamily: "monospace", fontSize: 12, bgcolor: TEINTE, color: BLEU, px: 0.5, py: 0.1, borderRadius: 0.75 }}>
          {morceau.slice(1, -1)}
        </Box>
      );
    }
    if (morceau.startsWith("*") && morceau.endsWith("*") && morceau.length > 2) {
      // eslint-disable-next-line react/no-array-index-key
      return <em key={i}>{morceau.slice(1, -1)}</em>;
    }
    return morceau;
  });
}

const PUCE = /^\s*(?:[-*•]|\d+[.)])\s+/;
const NUMERO = /^\s*\d+[.)]\s+/;
const LIGNE_TABLEAU = /^\s*\|.*\|\s*$/;
const SEPARATEUR_TABLEAU = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

const cellules = (ligne) => ligne.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

/** Découpe le texte en blocs : titres, paragraphes, listes et tableaux Markdown. */
function blocsDe(texte) {
  const blocs = [];
  for (const ligne of (texte || "").split("\n")) {
    const dernier = blocs[blocs.length - 1];
    if (LIGNE_TABLEAU.test(ligne)) {
      if (SEPARATEUR_TABLEAU.test(ligne)) continue;
      if (dernier?.type === "tableau") dernier.lignes.push(cellules(ligne));
      else blocs.push({ type: "tableau", lignes: [cellules(ligne)] });
      continue;
    }
    const titre = ligne.match(/^#{1,6}\s+(.*)$/);
    if (titre) {
      blocs.push({ type: "titre", texte: titre[1].replace(/\*\*/g, "") });
      continue;
    }
    if (!ligne.trim()) continue;
    if (PUCE.test(ligne)) {
      const ordonnee = NUMERO.test(ligne);
      const element = ligne.replace(PUCE, "");
      if (dernier?.type === "liste" && dernier.ordonnee === ordonnee) dernier.elements.push(element);
      else blocs.push({ type: "liste", ordonnee, elements: [element] });
    } else {
      blocs.push({ type: "paragraphe", texte: ligne });
    }
  }
  return blocs;
}

/** Curseur clignotant affiché à la fin du texte pendant la rédaction. */
function Curseur() {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        display: "inline-block", width: 7, height: 14, ml: 0.25, verticalAlign: "text-bottom", bgcolor: BLEU, borderRadius: 0.5,
        animation: "curseur-ia 1s steps(2, start) infinite",
        "@keyframes curseur-ia": { to: { visibility: "hidden" } },
      }}
    />
  );
}

const TEXTE_SX = { fontSize: 13.5, lineHeight: 1.6, color: TEXTE, wordBreak: "break-word" };

function TableauMarkdown({ lignes }) {
  const [entete, ...corps] = lignes;
  return (
    <Box sx={{ overflowX: "auto", border: `1px solid ${BORDURE}`, borderRadius: 1.5 }}>
      <Box component="table" sx={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
        <thead>
          <tr>
            {entete.map((c, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <Box component="th" key={i} sx={{ textAlign: "left", px: 1, py: 0.75, bgcolor: TEINTE, borderBottom: `2px solid ${JAUNE}`, fontWeight: 700, whiteSpace: "nowrap" }}>
                {enLigne(c)}
              </Box>
            ))}
          </tr>
        </thead>
        <tbody>
          {corps.map((ligne, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={i}>
              {ligne.map((c, j) => (
                // eslint-disable-next-line react/no-array-index-key
                <Box component="td" key={j} sx={{ px: 1, py: 0.6, borderTop: i ? `1px solid ${BORDURE}` : "none" }}>{enLigne(c)}</Box>
              ))}
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  );
}

/** Pendant la rédaction, un marqueur pas encore refermé (« **PAP ») n'est pas affiché tel quel. */
function sansMarqueurOuvert(texte) {
  let propre = texte;
  for (const marqueur of ["**", "`"]) {
    if (propre.split(marqueur).length % 2 === 0) {
      const position = propre.lastIndexOf(marqueur);
      propre = propre.slice(0, position) + propre.slice(position + marqueur.length);
    }
  }
  return propre;
}

/** Rendu sobre de la réponse : titres, paragraphes, listes, tableaux, gras ; ``curseur`` pendant la rédaction. */
export function TexteFormate({ texte, curseur = false }) {
  const blocs = blocsDe(curseur ? sansMarqueurOuvert(texte || "") : texte);
  const fin = (i) => (curseur && i === blocs.length - 1 ? <Curseur /> : null);
  if (!blocs.length) return curseur ? <Curseur /> : null;
  return (
    <Box sx={{ "& > * + *": { mt: 1 } }}>
      {blocs.map((bloc, i) => {
        if (bloc.type === "tableau") {
          // eslint-disable-next-line react/no-array-index-key
          return <Box key={i}><TableauMarkdown lignes={bloc.lignes} />{fin(i)}</Box>;
        }
        if (bloc.type === "titre") {
          return (
            // eslint-disable-next-line react/no-array-index-key
            <Typography key={i} sx={{ ...TEXTE_SX, fontWeight: 700, color: BLEU, fontSize: 13.5 }}>
              {enLigne(bloc.texte)}
              {fin(i)}
            </Typography>
          );
        }
        if (bloc.type === "liste") {
          return (
            // eslint-disable-next-line react/no-array-index-key
            <Box component={bloc.ordonnee ? "ol" : "ul"} key={i} sx={{ m: 0, pl: 2.5, "& li::marker": { color: BLEU, fontWeight: 700 } }}>
              {bloc.elements.map((element, j) => (
                // eslint-disable-next-line react/no-array-index-key
                <Typography component="li" key={j} sx={{ ...TEXTE_SX, "& + li": { mt: 0.25 } }}>
                  {enLigne(element)}
                  {j === bloc.elements.length - 1 && fin(i)}
                </Typography>
              ))}
            </Box>
          );
        }
        return (
          // eslint-disable-next-line react/no-array-index-key
          <Typography key={i} sx={TEXTE_SX}>
            {enLigne(bloc.texte)}
            {fin(i)}
          </Typography>
        );
      })}
    </Box>
  );
}
