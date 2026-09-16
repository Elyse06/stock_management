import { Alert, Box, Paper, Stack, Typography } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useImportImmobilisations } from "../hooks/useImportImmobilisations";
import { FileUploadZone } from "../components/FileUploadZone";
import { ImportSummary } from "../components/ImportSummary";
import { ImportReportTable } from "../components/ImportReportTable";
import { ImportActions } from "../components/ImportActions";

export function ImportImmobilisationsPage() {
  const {
    fichier,
    rapport,
    etape,
    loading,
    erreur,
    ETAPES,
    choisirFichier,
    previsualiser,
    confirmer,
    annuler,
    recommencer,
  } = useImportImmobilisations();

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      {/* Titre de la page */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1,
            bgcolor: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
          }}
        >
          <UploadFileIcon />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Import des immobilisations
          </Typography>
        </Box>
      </Stack>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: "1px solid #E0E0E0",
          borderRadius: 1,
          bgcolor: "#FFFFFF",
        }}
      >
        <Stack spacing={3}>
          {/* Zone d'upload (masquée après confirmation) */}
          {etape !== ETAPES.CONFIRME && (
            <FileUploadZone
              fichier={fichier}
              onChoisir={choisirFichier}
              disabled={loading}
            />
          )}

          {/* Erreur globale */}
          {erreur && (
            <Alert severity="error" variant="outlined" onClose={() => {}}>
              {erreur}
            </Alert>
          )}

          {/* Rapport */}
          {rapport && (
            <Stack spacing={2}>
              <ImportSummary rapport={rapport} />
              <ImportReportTable rapport={rapport} />
            </Stack>
          )}

          {/* Actions */}
          <ImportActions
            etape={etape}
            ETAPES={ETAPES}
            loading={loading}
            fichier={fichier}
            lignesOk={rapport?.lignes_ok ?? 0}
            onPrevisualiser={previsualiser}
            onConfirmer={confirmer}
            onRecommencer={recommencer}
            onAnnuler={annuler}
          />
        </Stack>
      </Paper>
    </Box>
  );
}