import { Alert, Box, Button, LinearProgress, Stack } from "@mui/material";
import { CheckCircle as CheckCircleIcon, PlayArrow as PlayArrowIcon } from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";

import { FileDropZone } from "@/components/import/FileDropZone";
import { ImportResultCard } from "@/components/import/ImportResultCard";

import { FournituresPreview } from "../components/FournituresPreview";
import { ImportPageHeader } from "../components/ImportPageHeader";
import { EXTENSIONS_FOURNITURES, useImportFournitures } from "../hooks/useImportFournitures";

export function ImportFournituresPage() {
  const queryClient = useQueryClient();
  const imp = useImportFournitures();
  const { rapport, etape, ETAPES, loading } = imp;

  const confirmer = async () => {
    if (await imp.confirmer()) {
      ["articles", "mouvements", "options", "dashboard"].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    }
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", p: { xs: 2, md: 3 } }}>
      <ImportPageHeader titre="Importer des fournitures" sousTitre="Intégrez vos fournitures depuis un fichier Excel" />
      <Stack spacing={2.5}>
        {imp.erreur && <Alert severity="error">{imp.erreur}</Alert>}

        {etape === ETAPES.CONFIRME && rapport ? (
          <ImportResultCard rapport={rapport} libelle="fourniture(s)" onRecommencer={imp.recommencer} />
        ) : (
          <>
            <FileDropZone fichier={imp.fichier} onChoisir={imp.choisirFichier} disabled={loading} extensions={EXTENSIONS_FOURNITURES} />
            {loading && <LinearProgress />}
            {rapport && etape === ETAPES.APERCU && <FournituresPreview rapport={rapport} onChanger={imp.recommencer} />}
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              {etape === ETAPES.CHOIX && imp.fichier && (
                <Button variant="contained" disabled={loading} startIcon={<PlayArrowIcon />} onClick={imp.previsualiser} sx={{ fontWeight: 700, px: 3 }}>
                  {loading ? "Analyse..." : "Prévisualiser"}
                </Button>
              )}
              {etape === ETAPES.APERCU && (
                <>
                  {loading && (
                    <Button color="inherit" onClick={imp.annuler}>
                      Annuler
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    disabled={loading || !(rapport?.lignes_ok > 0)}
                    startIcon={<CheckCircleIcon />}
                    onClick={confirmer}
                    sx={{ fontWeight: 700, px: 3 }}
                  >
                    {loading ? "Importation..." : `Confirmer l'import (${rapport?.lignes_ok || 0})`}
                  </Button>
                </>
              )}
            </Box>
          </>
        )}
      </Stack>
    </Box>
  );
}
