import { Box, Stack, Typography, Alert } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import InfoIcon from "@mui/icons-material/Info";

export function ImportSummary({ rapport }) {
  if (!rapport) return null;

  const total = rapport.lignes_ok + rapport.lignes_erreur;

  return (
    <Stack spacing={2}>
      {/* Stats principales */}
      <Stack direction="row" spacing={2} flexWrap="wrap">
        <StatCard
          label="Lignes OK"
          value={rapport.lignes_ok}
          total={total}
          color="#1A7F37"
          icon={<CheckCircleIcon />}
        />
        <StatCard
          label="Erreurs"
          value={rapport.lignes_erreur}
          total={total}
          color="#C0392B"
          icon={<ErrorIcon />}
        />
        <StatCard
          label="Total"
          value={total}
          color="#424242"
          icon={<InfoIcon />}
        />
      </Stack>

      {/* Statut global */}
      {rapport.dry_run ? (
        <Alert severity="info" variant="outlined" icon={<InfoIcon />}>
          <strong>Aperçu uniquement</strong>
        </Alert>
      ) : (
        <Alert severity="success" variant="outlined" icon={<CheckCircleIcon />}>
          <strong>Import confirmé</strong> — les données ont été enregistrées.
        </Alert>
      )}

      {/* Ligne d'en-tête détectée */}
      {rapport.ligne_entete_utilisee && (
        <Typography variant="body2" color="text.secondary">
          En-têtes détectés à la ligne <strong>{rapport.ligne_entete_utilisee}</strong> du fichier.
        </Typography>
      )}

      {/* Colonnes manquantes */}
      {rapport.colonnes_manquantes?.length > 0 && (
        <Alert severity="warning" variant="outlined">
          <strong>Colonnes attendues absentes :</strong>{" "}
          {rapport.colonnes_manquantes.join(", ")}
        </Alert>
      )}
    </Stack>
  );
}

function StatCard({ label, value, total, color, icon }) {
  return (
    <Box
      sx={{
        flex: "1 1 140px",
        minWidth: 140,
        border: "1px solid #E0E0E0",
        borderRadius: 1,
        p: 2,
        bgcolor: "#FFFFFF",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ color }}>
        {icon}
        <Typography variant="body2" fontWeight={600}>
          {label}
        </Typography>
      </Stack>
      <Typography variant="h4" fontWeight={700} sx={{ color, mt: 0.5 }}>
        {value}
      </Typography>
      {total !== undefined && (
        <Typography variant="caption" color="text.secondary">
          sur {total} ligne(s)
        </Typography>
      )}
    </Box>
  );
}