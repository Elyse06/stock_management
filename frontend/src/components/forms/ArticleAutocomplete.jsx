import { Autocomplete, Box, TextField, Typography } from "@mui/material";

/** Sélecteur d'article (recherche par code ou désignation). */
export function ArticleAutocomplete({ articles, value, onChange, label = "Article", size = "small", ...props }) {
  return (
    <Autocomplete
      size={size}
      options={articles}
      value={value ?? null}
      onChange={(_, article) => onChange(article)}
      getOptionLabel={(a) => `${a.code_article} - ${a.designation}`}
      isOptionEqualToValue={(a, v) => a.code_article === v.code_article}
      noOptionsText="Aucun article"
      renderInput={(params) => <TextField {...params} label={label} placeholder="Rechercher par code ou désignation..." />}
      renderOption={(optionProps, a) => {
        const { key, ...rest } = optionProps;
        return (
          <Box component="li" key={key} {...rest}>
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {a.designation}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {a.code_article}
                {a.categorie_nom ? ` • ${a.categorie_nom}` : ""}
                {a.mode_suivi === "NUMERO_SERIE" ? " • N° de série" : ""}
              </Typography>
            </Box>
          </Box>
        );
      }}
      {...props}
    />
  );
}
