import { Autocomplete, Box, Button, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";

import { StyledTable } from "@/components/table/StyledTable";

import { AttributionEditor } from "../AttributionEditor";

const COLONNES = [{ label: "Article", minWidth: 250 }, { label: "Quantité", width: 130 }, { label: "Attribution", minWidth: 420 }, { label: "", width: 60 }];
const libelleArticle = (a) => (a ? `${a.designation} - ${a.categorie_nom || "Sans catégorie"} - Stock : ${a.stock_calcule ?? 0}` : "");

/** Étape 1 : articles, quantités et attributions. */
export function LignesStep({ form }) {
  const { articles, employees, directions, sites, salles } = form.references;

  return (
    <Box>
      <StyledTable columns={COLONNES}>
        {form.lignes.map((ligne, index) => {
          const article = articles.find((a) => a.code_article === ligne.article);
          const quantiteInvalide = Boolean(ligne.article) && !(Number(ligne.quantite) > 0);
          return (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={index}>
              <td>
                <Autocomplete
                  size="small"
                  options={articles}
                  value={article || null}
                  getOptionLabel={libelleArticle}
                  isOptionEqualToValue={(o, v) => o?.code_article === v?.code_article}
                  onChange={(_, value) =>
                    form.modifierLigne(index, {
                      article: value?.code_article || "",
                      article_designation: value?.designation || "",
                      attributions: [],
                    })
                  }
                  renderOption={(props, option) => {
                    const { key, ...rest } = props;
                    return (
                      <li key={key} {...rest}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {option.designation}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.categorie_nom || "Sans catégorie"} - Stock : {option.stock_calcule ?? 0}
                          </Typography>
                        </Box>
                      </li>
                    );
                  }}
                  renderInput={(params) => <TextField {...params} label="Article" placeholder="Rechercher..." />}
                  noOptionsText="Aucun article trouvé"
                />
              </td>
              <td>
                <TextField
                  size="small"
                  fullWidth
                  type="number"
                  value={ligne.quantite}
                  onChange={(e) => form.modifierLigne(index, { quantite: e.target.value })}
                  slotProps={{ htmlInput: { min: 1, step: 1 } }}
                  error={quantiteInvalide}
                />
              </td>
              <td>
                <AttributionEditor
                  quantiteTotale={Number(ligne.quantite)}
                  attributions={ligne.attributions}
                  setAttributions={(attributions) => form.modifierLigne(index, { attributions })}
                  employees={employees}
                  directions={directions}
                  sites={sites}
                  salles={salles}
                  demandeurParDefaut={form.demandeur}
                />
              </td>
              <td align="center">
                <Tooltip title="Retirer la ligne">
                  <IconButton size="small" color="error" onClick={() => form.retirerLigne(index)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </td>
            </tr>
          );
        })}
      </StyledTable>
      <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={form.ajouterLigne}>
        Ajouter une ligne
      </Button>
    </Box>
  );
}
