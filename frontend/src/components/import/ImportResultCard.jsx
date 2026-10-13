import { Box, Button, Paper, Typography } from "@mui/material";
import { CheckCircle as CheckCircleIcon, RestartAlt as RestartAltIcon } from "@mui/icons-material";

/** Bilan d'un import confirmé (créés, mis à jour, ignorés, erreurs). */
export function ImportResultCard({ rapport, libelle = "élément(s)", onRecommencer }) {
  const compteurs = [
    ["Nouveaux", `+${rapport.lignes_creees || 0}`, "#2E7D32"],
    ["Mis à jour", rapport.lignes_maj || 0, "#0288D1"],
    ["Ignorés", rapport.lignes_ignorees || 0, "text.secondary"],
    ["Erreurs", rapport.lignes_erreur || 0, "#D32F2F"],
  ];
  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, bgcolor: "#F1F8E9", border: "1px solid #C8E6C9", borderRadius: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <CheckCircleIcon sx={{ color: "#2E7D32", fontSize: 36 }} />
        <Box>
          <Typography variant="h6" fontWeight={700} color="#1B5E20">
            Importation terminée !
          </Typography>
          <Typography variant="body2" color="#2E7D32">
            {rapport.count_total || 0} {libelle} traité(s) avec succès.
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" }, gap: 2 }}>
        {compteurs.map(([label, valeur, couleur]) => (
          <Paper key={label} sx={{ p: 1.5, textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h5" fontWeight={700} color={couleur}>
              {valeur}
            </Typography>
          </Paper>
        ))}
      </Box>
      {onRecommencer && (
        <Button sx={{ mt: 2 }} variant="outlined" startIcon={<RestartAltIcon />} onClick={onRecommencer}>
          Effectuer un nouvel import
        </Button>
      )}
    </Paper>
  );
}
