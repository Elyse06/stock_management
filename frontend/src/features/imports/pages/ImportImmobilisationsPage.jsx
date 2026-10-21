import { Alert, Box, Paper, Stack } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";

import { FileDropZone } from "@/components/import/FileDropZone";

import { ImportActions } from "../components/ImportActions";
import { ImportPageHeader } from "../components/ImportPageHeader";
import { ImportReportTable } from "../components/ImportReportTable";
import { ImportSummary } from "../components/ImportSummary";
import { useImportImmobilisations } from "../hooks/useImportImmobilisations";

export function ImportImmobilisationsPage() {
  const queryClient = useQueryClient();
  const imp = useImportImmobilisations();
  const { rapport, etape, ETAPES, loading } = imp;

  const confirmer = async () => {
    if (await imp.confirmer()) {
      ["articles", "mouvements", "unites", "options", "dashboard"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      <ImportPageHeader titre="Import des immobilisations" />
      <Paper elevation={0} sx={{ p: 3, border: "1px solid #E0E0E0", borderRadius: 1 }}>
        <Stack spacing={3}>
          {etape !== ETAPES.CONFIRME && <FileDropZone fichier={imp.fichier} onChoisir={imp.choisirFichier} disabled={loading} />}
          {imp.erreur && (
            <Alert severity="error" variant="outlined">
              {imp.erreur}
            </Alert>
          )}
          {rapport && (
            <Stack spacing={2}>
              <ImportSummary rapport={rapport} />
              <ImportReportTable
                rapport={rapport}
                editable={etape === ETAPES.APERCU}
                clesConfirmees={imp.clesConfirmees}
                onBasculerConfirmationCle={imp.basculerConfirmationCle}
              />
            </Stack>
          )}
          <ImportActions
            etape={etape}
            ETAPES={ETAPES}
            loading={loading}
            fichier={imp.fichier}
            peutConfirmer={imp.peutConfirmer}
            onPrevisualiser={imp.previsualiser}
            onConfirmer={confirmer}
            onRecommencer={imp.recommencer}
            onAnnuler={imp.annuler}
          />
        </Stack>
      </Paper>
    </Box>
  );
}
