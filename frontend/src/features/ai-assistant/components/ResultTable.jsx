import { useState } from "react";
import { Box, Button, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import { ArrowForward as ArrowForwardIcon, Check as CheckIcon, ContentCopy as CopyIcon, TableChart as TableIcon } from "@mui/icons-material";

import { BLEU, BORDURE, GRIS, JAUNE, TEINTE, TEINTE_CLAIRE, TEXTE } from "../constants/style";

const CELLULE = { fontSize: 12, py: 0.75, px: 1.25, borderBottom: `1px solid ${BORDURE}` };
// Nombres, montants (« 12 500 Ar »), pourcentages, durées (« 3 j ») : alignés à droite.
const NOMBRE = /^[-+−]?\d[\d\s .,]*(\s?(%|Ar|j|jours?|u\.?))?$/;

const estNombre = (valeur) => typeof valeur === "number" || (typeof valeur === "string" && NOMBRE.test(valeur.trim()));

/** Tableau de résultats produit par un outil (données exactes, non reformulées par le modèle). */
export function ResultTable({ tableau, onNaviguer, hauteurMax = 260 }) {
  const { titre, colonnes, lignes, total, lien } = tableau;
  const [copie, setCopie] = useState(false);
  // Colonne numérique : toutes ses valeurs non vides sont des nombres.
  const numeriques = colonnes.map((_, j) => {
    const valeurs = lignes.map((l) => l[j]).filter((v) => v !== null && v !== undefined && v !== "" && v !== "—");
    return valeurs.length > 0 && valeurs.every(estNombre);
  });

  const copier = async () => {
    const tsv = [colonnes, ...lignes].map((l) => l.map((v) => String(v ?? "").replace(/\s+/g, " ")).join("\t")).join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      setCopie(true);
      setTimeout(() => setCopie(false), 1500);
    } catch {
      // Presse-papiers indisponible (contexte non sécurisé) : rien à faire.
    }
  };

  return (
    <Box sx={{ mt: 1.5, border: `1px solid ${BORDURE}`, borderRadius: 2, overflow: "hidden", bgcolor: "#FFFFFF" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.25, py: 0.75, bgcolor: TEINTE_CLAIRE, borderBottom: `1px solid ${BORDURE}` }}>
        <TableIcon sx={{ fontSize: 16, color: BLEU }} />
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: TEXTE, flex: 1, minWidth: 0 }} noWrap title={titre}>
          {titre}
        </Typography>
        <Typography sx={{ fontSize: 11, color: GRIS, flexShrink: 0 }}>
          {total > lignes.length ? `${lignes.length} sur ${total}` : `${lignes.length} ligne${lignes.length > 1 ? "s" : ""}`}
        </Typography>
        <Tooltip title={copie ? "Copié" : "Copier (coller dans Excel)"}>
          <IconButton size="small" onClick={copier} aria-label="Copier le tableau" sx={{ p: 0.5 }}>
            {copie ? <CheckIcon sx={{ fontSize: 16, color: "success.main" }} /> : <CopyIcon sx={{ fontSize: 15, color: GRIS }} />}
          </IconButton>
        </Tooltip>
      </Box>
      <TableContainer sx={{ maxHeight: hauteurMax }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {colonnes.map((colonne, j) => (
                <TableCell
                  key={colonne}
                  align={numeriques[j] ? "right" : "left"}
                  sx={{ ...CELLULE, fontWeight: 700, color: TEXTE, bgcolor: TEINTE, borderBottom: `2px solid ${JAUNE}`, whiteSpace: "nowrap" }}
                >
                  {colonne}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {lignes.map((ligne, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <TableRow key={i} sx={{ "&:nth-of-type(even)": { bgcolor: "#FAFCFE" }, "&:hover": { bgcolor: TEINTE_CLAIRE } }}>
                {ligne.map((valeur, j) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <TableCell key={j} align={numeriques[j] ? "right" : "left"}
                    sx={{ ...CELLULE, fontVariantNumeric: numeriques[j] ? "tabular-nums" : undefined, whiteSpace: numeriques[j] ? "nowrap" : undefined }}>
                    {valeur}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {lien && (
        <Box sx={{ borderTop: `1px solid ${BORDURE}`, px: 0.5 }}>
          <Button size="small" endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />} onClick={() => onNaviguer(lien.chemin)}
            sx={{ fontSize: 12, fontWeight: 600 }}>
            {total > lignes.length ? `${lien.libelle} (${total})` : lien.libelle}
          </Button>
        </Box>
      )}
    </Box>
  );
}
