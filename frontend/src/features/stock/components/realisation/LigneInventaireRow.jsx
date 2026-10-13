import { memo } from "react";
import { Box, Button, Chip, Collapse, TextField, Typography } from "@mui/material";
import { ExpandLess as ExpandLessIcon, ExpandMore as ExpandMoreIcon } from "@mui/icons-material";

import { formatEcart, nbPropositions } from "../../utils/saisieInventaire";

import { AjustementPanel } from "./AjustementPanel";

/** Ligne de saisie d'un article (mémorisée : seule la ligne modifiée se redessine). */
export const LigneInventaireRow = memo(function LigneInventaireRow({
  article,
  saisie,
  theorique,
  ouverte,
  unites,
  chargementUnites,
  onChange,
  onToggle,
}) {
  const code = article.code_article;
  const physique = saisie.quantite_physique === "" ? null : Number(saisie.quantite_physique) || 0;
  const ecart = physique === null ? null : physique - theorique;
  const isImmo = article.is_immobilisation;
  const isNumeroSerie = isImmo && article.mode_suivi === "NUMERO_SERIE";
  const nbProps = nbPropositions(saisie);
  const besoinPropositions = isNumeroSerie && physique !== null && (ecart !== 0 || saisie.showChangementEtat);
  const update = (patch) => onChange(code, patch);

  return (
    <>
      <tr>
        <td>
          <Typography variant="body2" fontWeight={500}>
            {article.designation}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontFamily="monospace">
            {code}
          </Typography>
        </td>
        <td align="center">
          <Typography variant="body2" fontFamily="monospace">
            {theorique}
          </Typography>
        </td>
        <td align="center">
          <TextField
            size="small"
            type="number"
            value={saisie.quantite_physique}
            onChange={(e) => update({ quantite_physique: e.target.value })}
            slotProps={{ htmlInput: { min: 0, step: 1, style: { textAlign: "center" }, "aria-label": `Quantité physique ${code}` } }}
            placeholder="0"
            sx={{ width: 100 }}
          />
        </td>
        <td align="center">
          {ecart === null ? (
            <Chip label="—" size="small" variant="outlined" />
          ) : (
            <Typography variant="body2" fontWeight={700} fontFamily="monospace" sx={{ color: ecart === 0 ? "success.main" : "error.main" }}>
              {formatEcart(ecart)}
            </Typography>
          )}
        </td>
        <td>
          <TextField
            size="small"
            fullWidth
            value={saisie.commentaire}
            onChange={(e) => update({ commentaire: e.target.value })}
            slotProps={{ htmlInput: { maxLength: 255 } }}
          />
        </td>
        <td align="center">
          {isImmo ? (
            <Button
              size="small"
              variant={nbProps > 0 ? "contained" : "outlined"}
              color={nbProps > 0 ? "primary" : "inherit"}
              endIcon={ouverte ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => onToggle(article)}
              disabled={physique === null}
            >
              {nbProps > 0 ? `Ajustement (${nbProps})` : "Ajustement"}
            </Button>
          ) : (
            <Chip label="—" size="small" variant="outlined" />
          )}
        </td>
      </tr>
      {isImmo && (
        <tr>
          <td colSpan={6} style={{ padding: 0, border: 0 }}>
            <Collapse in={ouverte} timeout="auto" unmountOnExit>
              <Box sx={{ p: 2, bgcolor: "#FAFAFA", borderTop: "1px solid #E0E0E0" }}>
                <AjustementPanel
                  article={article}
                  saisie={saisie}
                  ecart={ecart}
                  unites={unites}
                  chargement={chargementUnites}
                  besoinPropositions={besoinPropositions}
                  onChange={update}
                />
              </Box>
            </Collapse>
          </td>
        </tr>
      )}
    </>
  );
});
