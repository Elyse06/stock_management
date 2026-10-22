import { useMemo } from "react";
import { Alert, Autocomplete, Box, Button, Paper, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import {
  Add as AjouterIcon,
  Check as MettreAJourIcon,
  Inventory2Outlined as ExistantIcon,
  NewReleasesOutlined as NouveauIcon,
} from "@mui/icons-material";

import { TypeArticleChip } from "@/components/data-display/TypeArticleChip";
import { groupeTypeArticle, trierParType } from "@/constants/articles";

import { MODE_EXISTANT, MODE_NOUVEAU, resteAuDemandeur, SPECIFICATION_MAX } from "../../utils/nouvelleCommande";
import { AttributionEditor } from "../AttributionEditor";

const libelleArticle = (a) => (a ? `${a.designation} (${a.code_article})` : "");

function Rubrique({ numero, titre, children }) {
  return (
    <Box>
      <Typography variant="body2" fontWeight={700} sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
        <Box component="span" sx={{ width: 22, height: 22, borderRadius: "50%", bgcolor: "primary.main", color: "#FFFFFF", fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          {numero}
        </Box>
        {titre}
      </Typography>
      {children}
    </Box>
  );
}

function ChoixArticle({ form, modifierForm, articles }) {
  // Choix groupés par type d'article : immobilisations, puis fournitures.
  const options = useMemo(() => trierParType(articles), [articles]);
  const article = form.article;
  return (
    <Box>
      <Autocomplete
        options={options}
        groupBy={groupeTypeArticle}
        value={article}
        getOptionLabel={libelleArticle}
        isOptionEqualToValue={(o, v) => o?.code_article === v?.code_article}
        onChange={(_, valeur) => modifierForm({ article: valeur })}
        renderOption={(props, option) => {
          const { key, ...rest } = props;
          return (
            <li key={key} {...rest}>
              <Box>
                <Typography variant="body2" fontWeight={600}>{option.designation}</Typography>
              </Box>
            </li>
          );
        }}
        renderInput={(params) => <TextField {...params} label="Article" placeholder="Rechercher par désignation ou code..." />}
        noOptionsText="Aucun article trouvé : utilisez « Nouvel article »"
      />
      {article && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mt: 1 }}>
          <TypeArticleChip immobilisation={article.is_immobilisation} />
          <Typography variant="caption" color="text.secondary">
            {article.categorie_nom || "Sans catégorie"}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

/** Partie gauche de la page « Nouvelle commande » : saisie d'une ligne (article, quantité, attribution). */
export function FormulaireLigne({ commande }) {
  const { form, modifierForm, enEdition, erreur, references } = commande;
  const { articles, employees, directions, sites, salles } = references;
  const numeroEdite = enEdition ? commande.lignes.findIndex((l) => l.cle === enEdition) + 1 : null;
  const reste = resteAuDemandeur(form);

  return (
    <Paper
      variant="outlined"
      component="section"
      aria-label="Formulaire d'article"
      sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2, borderTop: "3px solid", borderTopColor: enEdition ? "warning.main" : "primary.main" }}
    >
      <Typography variant="h3" sx={{ mb: 0.5 }}>
        {enEdition ? `Modifier la ligne n°${numeroEdite}` : "Ajouter un article"}
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        <Rubrique numero={1} titre="Article">
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            color="primary"
            value={form.mode}
            onChange={(_, mode) => mode && modifierForm({ mode })}
            sx={{ mb: 1.5 }}
          >
            <ToggleButton value={MODE_EXISTANT} sx={{ gap: 0.75, textTransform: "none", fontWeight: 600 }}>
              <ExistantIcon fontSize="small" /> Article existant
            </ToggleButton>
            <ToggleButton value={MODE_NOUVEAU} sx={{ gap: 0.75, textTransform: "none", fontWeight: 600 }}>
              <NouveauIcon fontSize="small" /> Nouvel article
            </ToggleButton>
          </ToggleButtonGroup>
          {form.mode === MODE_EXISTANT ? (
            <ChoixArticle form={form} modifierForm={modifierForm} articles={articles} />
          ) : (
            <TextField
              label="Spécification du matériel souhaité"
              value={form.specification}
              onChange={(e) => modifierForm({ specification: e.target.value })}
              multiline
              minRows={3}
              fullWidth
              slotProps={{ htmlInput: { maxLength: SPECIFICATION_MAX } }}
            />
          )}
        </Rubrique>

        <Rubrique numero={2} titre="Quantité">
          <TextField
            label="Quantité"
            type="number"
            value={form.quantite}
            onChange={(e) => modifierForm({ quantite: e.target.value })}
            slotProps={{ htmlInput: { min: 1, step: 1 } }}
            sx={{ width: 160 }}
          />
        </Rubrique>

        <Rubrique numero={3} titre="Attribution">
          <Box sx={{ overflowX: "auto" }}>
            <AttributionEditor
              quantiteTotale={Number(form.quantite) || 0}
              attributions={form.attributions}
              setAttributions={(attributions) => modifierForm({ attributions })}
              employees={employees}
              directions={directions}
              sites={sites}
              salles={salles}
              demandeurParDefaut={commande.demandeur}
            />
          </Box>
          {form.attributions.length > 0 && reste > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              Reste non réparti ({reste}) : attribué au demandeur.
            </Typography>
          )}
        </Rubrique>

        {erreur && <Alert severity="warning" variant="outlined">{erreur}</Alert>}

        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", flexWrap: "wrap" }}>
          {enEdition && (
            <Button color="inherit" onClick={commande.annulerEdition}>Annuler la modification</Button>
          )}
          <Button
            variant="contained"
            color={enEdition ? "warning" : "primary"}
            disableElevation
            startIcon={enEdition ? <MettreAJourIcon /> : <AjouterIcon />}
            onClick={commande.validerLigne}
            sx={{ fontWeight: 600 }}
          >
            {enEdition ? "Mettre à jour la ligne" : "Ajouter à la liste"}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
