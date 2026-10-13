import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Box, Typography, Paper, Stack, Alert, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, FormControlLabel,
  Checkbox, LinearProgress, Divider,
} from "@mui/material";
import {
  UploadFile as UploadFileIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  RestartAlt as RestartAltIcon,
} from "@mui/icons-material";
import { FileDropZone } from "@/components/import/FileDropZone";
import { ImportResultCard } from "@/components/import/ImportResultCard";
import { exportToCSV } from "@/utils/export";

import { EXTENSIONS, useImportEmployees } from "../hooks/useImportEmployees";

const COLONNES_MODELE = ["Mle", "Nom et prénoms", "Direction", "Fonction", "Lieu de Travail", "Affectation"];
const EXEMPLE = {
  Mle: "8101",
  "Nom et prénoms": "RAZAFINDRABE Jean",
  Direction: "Direction de l'Exploitation",
  Fonction: "Responsable Agence",
  "Lieu de Travail": "Antaninarenina",
  Affectation: "SIEGE",
};

export function EmployeeImportModal({ isOpen, onClose, onSuccess }) {
  const {
    fichier, rapport, etape, loading, erreur, overwrite, setOverwrite,
    ETAPES, choisirFichier, previsualiser, confirmer,
  } = useImportEmployees();

  const resetAll = () => choisirFichier(null);

  const handleClose = () => {
    if (loading) return;
    resetAll();
    onClose();
  };

  const handleConfirmImport = async () => {
    if (await confirmer()) onSuccess?.();
  };

  const handleDownloadTemplate = () =>
    exportToCSV([EXEMPLE], "modele_import_employes", COLONNES_MODELE.map((c) => ({ label: c, field: c })));

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 2 } } }}>
      <DialogTitle sx={{ pb: 1, pt: 2.5, px: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: 1.5, bgcolor: "#FFF8E1", display: "flex", alignItems: "center", justifyContent: "center", color: "primary.dark" }}>
              <UploadFileIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>Importer des employés</Typography>
              <Typography variant="body2" color="text.secondary">
                Intégrez rapidement vos listes de personnel depuis un fichier Excel
              </Typography>
            </Box>
          </Box>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadTemplate} sx={{ textTransform: "none", fontSize: 12 }}>
            Modèle CSV
          </Button>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          {etape === ETAPES.CONFIRME && rapport ? (
            <ImportResultCard rapport={rapport} libelle="employé(s)" />
          ) : (
            <>
              <FileDropZone fichier={fichier} onChoisir={choisirFichier} disabled={loading} extensions={EXTENSIONS} />

              {loading && <LinearProgress color="primary" />}
              {erreur && <Alert severity="error">{erreur}</Alert>}

              {rapport && etape === ETAPES.APERCU && (
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      Aperçu ({rapport.lignes_ok} employés détectés)
                    </Typography>
                    <Button size="small" startIcon={<RestartAltIcon />} onClick={resetAll} sx={{ textTransform: "none", fontSize: 12 }}>
                      Changer
                    </Button>
                  </Box>

                  {rapport.colonnes_manquantes?.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      Colonnes manquantes : {rapport.colonnes_manquantes.join(", ")}
                    </Alert>
                  )}

                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 260 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Matricule</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Nom</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Direction</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Site</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(rapport.details || []).slice(0, 50).map((r, i) => (
                          <TableRow key={i} hover>
                            <TableCell><Chip label={r.matricule || "Auto"} size="small" sx={{ fontWeight: 600, fontSize: 11 }} /></TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{r.nom}</TableCell>
                            <TableCell>{r.direction || "-"}</TableCell>
                            <TableCell>{r.site || "-"}</TableCell>
                            <TableCell>
                              <Chip
                                label={r.statut}
                                size="small"
                                color={
                                  r.statut === "ERREUR" ? "error"
                                  : r.statut === "IGNORÉ" ? "default"
                                  : "success"
                                }
                                sx={{ fontSize: 11 }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box sx={{ mt: 1.5, p: 1.5, bgcolor: "#FAFAFA", borderRadius: 1.5 }}>
                    <FormControlLabel
                      control={<Checkbox checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} color="primary" size="small" />}
                      label={<Typography variant="body2">Mettre à jour les employés existants si le matricule correspond</Typography>}
                    />
                  </Box>
                </Box>
              )}
            </>
          )}
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5, bgcolor: "#FAFAFA", justifyContent: "space-between" }}>
        <Button onClick={handleClose} disabled={loading} color="inherit">
          {etape === ETAPES.CONFIRME ? "Fermer" : "Annuler"}
        </Button>
        {etape !== ETAPES.CONFIRME && (
          <Box sx={{ display: "flex", gap: 1 }}>
            {etape === ETAPES.CHOIX && fichier && (
              <Button
                variant="contained"
                disabled={loading}
                startIcon={<PlayArrowIcon />}
                onClick={previsualiser}
                sx={{ fontWeight: 700, px: 3 }}
              >
                {loading ? "Analyse..." : "Prévisualiser"}
              </Button>
            )}
            {etape === ETAPES.APERCU && (
              <Button
                variant="contained"
                disabled={loading || (rapport?.lignes_erreur > 0 && rapport.lignes_ok === 0)}
                startIcon={<CheckCircleIcon />}
                onClick={handleConfirmImport}
                sx={{ fontWeight: 700, px: 3 }}
              >
                {loading ? "Importation..." : `Confirmer l'import (${rapport?.lignes_ok || 0})`}
              </Button>
            )}
          </Box>
        )}
      </DialogActions>
    </Dialog>
  );
}