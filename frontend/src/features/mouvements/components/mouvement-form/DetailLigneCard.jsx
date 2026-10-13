import { Box, Button, Chip, IconButton, Paper, TextField, Typography } from "@mui/material";
import { Delete as DeleteIcon, QrCodeScanner as QrCodeScannerIcon } from "@mui/icons-material";

import { ArticleAutocomplete } from "@/components/forms/ArticleAutocomplete";
import { SelectFilter } from "@/components/forms/SelectFilter";

import { NumeroSerieInput } from "./NumeroSerieInput";

/** Une ligne d'article du mouvement : article, quantité ou N° de série, fournisseur et prix. */
export function DetailLigneCard({ index, row, form, fournisseurOptions, canRemove, onSaisieRapide }) {
  const article = form.getArticle(row.article);
  const modeSerie = article?.mode_suivi === "NUMERO_SERIE";
  const estEntree = form.type === "ENTREE";

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1.5, borderLeft: "3px solid", borderLeftColor: "secondary.main" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          LIGNE {index + 1}
        </Typography>
        {canRemove && (
          <IconButton size="small" color="error" onClick={() => form.retirerLigne(index)} aria-label={`Retirer la ligne ${index + 1}`}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <ArticleAutocomplete articles={form.articles} value={article} onChange={(a) => form.changerArticle(index, a)} />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: estEntree ? "140px 1fr 1fr" : "140px" },
          gap: 2,
          mt: 2,
          alignItems: "start",
          "& .MuiFormControl-root": { width: "100%" },
        }}
      >
        {modeSerie ? (
          <Button variant="outlined" startIcon={<QrCodeScannerIcon />} onClick={() => onSaisieRapide(index)} sx={{ height: 40 }}>
            Saisie rapide
          </Button>
        ) : (
          <TextField
            label="Quantité"
            type="number"
            size="small"
            value={row.quantite}
            onChange={(e) => form.modifierLigne(index, { quantite: e.target.value })}
            slotProps={{ htmlInput: { min: 1, step: 1 } }}
          />
        )}
        {estEntree && (
          <>
            <SelectFilter
              label="Fournisseur"
              value={row.fournisseur}
              onChange={(value) => form.modifierLigne(index, { fournisseur: value })}
              options={fournisseurOptions}
            />
            <TextField
              label="Prix d'achat (MGA)"
              type="number"
              size="small"
              value={row.prix_achat}
              onChange={(e) => form.modifierLigne(index, { prix_achat: e.target.value })}
              slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
            />
          </>
        )}
      </Box>

      {modeSerie && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
            Numéros de série ({row.numeros_de_serie.length})
          </Typography>
          {row.numeros_de_serie.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
              {row.numeros_de_serie.map((ns, nsIndex) => (
                <Chip
                  key={`${ns}-${nsIndex}`}
                  label={ns}
                  size="small"
                  onDelete={() => form.retirerNumero(index, nsIndex)}
                  sx={{ fontFamily: "monospace" }}
                />
              ))}
            </Box>
          )}
          <NumeroSerieInput onAdd={(nouveaux) => form.ajouterNumeros(index, nouveaux)} />
        </Box>
      )}
    </Paper>
  );
}
