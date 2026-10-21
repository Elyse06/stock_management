import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";

import { SearchField } from "@/components/forms/SearchField";

/** Recherche et filtre d'affichage (tous / saisis / écarts). */
export function RealisationToolbar({ recherche, onRecherche, affichage, onAffichage, compteurs }) {
  return (
    <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "stretch", sm: "center" }, gap: 1.5, mb: 2 }}>
      <SearchField value={recherche} onChange={onRecherche} placeholder="Rechercher un article..." sx={{ flex: { sm: 1 }, maxWidth: { sm: 360 } }} />
      <ToggleButtonGroup
        size="small"
        exclusive
        value={affichage}
        onChange={(_, value) => value && onAffichage(value)}
        sx={{
          "& .MuiToggleButton-root": {
            textTransform: "none",
            px: 1.5,
            "&.Mui-selected": { bgcolor: "tint.main", color: "primary.main", borderColor: "primary.main", fontWeight: 600 },
          },
        }}
      >
        <ToggleButton value="tous">Tous ({compteurs.tous})</ToggleButton>
        <ToggleButton value="saisis">Saisis ({compteurs.saisis})</ToggleButton>
        <ToggleButton value="ecarts">Écarts ({compteurs.ecarts})</ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}
