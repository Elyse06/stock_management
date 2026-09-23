import { Box, Typography, Grid } from "@mui/material";
import { Business as BusinessIcon } from "@mui/icons-material";

export function MouvementFournisseursSection({ details }) {
  const fournisseurs = details?.filter((d) => d.fournisseur_nom) || [];

  if (fournisseurs.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h3" sx={{ mb: 1.5 }}>Fournisseurs</Typography>
      <Grid container spacing={2}>
        {fournisseurs.map((detail, index) => (
          <Grid item xs={12} sm={6} key={index}>
            <Box sx={{ p: 2, bgcolor: "#FAFAFA", borderRadius: 1, border: "1px solid #E0E0E0", display: "flex", alignItems: "center", gap: 1 }}>
              <BusinessIcon color="primary" />
              <Box>
                <Typography variant="body2" color="text.secondary">Article</Typography>
                <Typography variant="body1" fontWeight={600}>{detail.article_designation}</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}><strong>Fournisseur : </strong>{detail.fournisseur_nom}</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}><strong>Prix d'achat : </strong>{detail.prix_achat} MGA</Typography>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}