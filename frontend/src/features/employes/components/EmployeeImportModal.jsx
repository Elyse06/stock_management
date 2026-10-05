import { useState, useRef } from "react";
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
import { useImportEmployees } from "../hooks/useImportEmployees";

export function EmployeeImportModal({ isOpen, onClose, onSuccess }) {
  const fileInputRef = useRef(null);
  const {
    fichier, rapport, etape, loading, erreur, overwrite, setOverwrite,
    ETAPES, choisirFichier, previsualiser, confirmer, recommencer,
  } = useImportEmployees();

  const resetAll = () => {
    choisirFichier(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (loading) return;
    resetAll();
    onClose();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) choisirFichier(selectedFile);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Mle: "8101",
        "Nom et prénoms": "RAZAFINDRABE Jean",
        Direction: "Direction de l'Exploitation",
        Fonction: "Responsable Agence",
        "Lieu de Travail": "Antaninarenina",
        Affectation: "SIEGE",
      },
    ];
    alert("Fonctionnalité de téléchargement du modèle à implémenter");
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
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
            Modèle Excel
          </Button>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          {etape === ETAPES.CONFIRME && rapport ? (
            <Paper sx={{ p: 3, bgcolor: "#F1F8E9", border: "1px solid #C8E6C9", borderRadius: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                <CheckCircleIcon sx={{ color: "#2E7D32", fontSize: 36 }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} color="#1B5E20">
                    Importation terminée !
                  </Typography>
                  <Typography variant="body2" color="#2E7D32">
                    {rapport.count_total || 0} employé(s) traité(s) avec succès.
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr 1fr" },
                  gap: 2,
                  mt: 2,
                }}
              >
                <Paper sx={{ p: 1.5, textAlign: "center", bgcolor: "#FFFFFF" }}>
                  <Typography variant="caption" color="text.secondary">Nouveaux</Typography>
                  <Typography variant="h5" fontWeight={700} color="#2E7D32">+{rapport.lignes_creees || 0}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5, textAlign: "center", bgcolor: "#FFFFFF" }}>
                  <Typography variant="caption" color="text.secondary">Mis à jour</Typography>
                  <Typography variant="h5" fontWeight={700} color="#0288D1">{rapport.lignes_maj || 0}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5, textAlign: "center", bgcolor: "#FFFFFF" }}>
                  <Typography variant="caption" color="text.secondary">Ignorés</Typography>
                  <Typography variant="h5" fontWeight={700} color="text.secondary">{rapport.lignes_ignorees || 0}</Typography>
                </Paper>
                <Paper sx={{ p: 1.5, textAlign: "center", bgcolor: "#FFFFFF" }}>
                  <Typography variant="caption" color="text.secondary">Erreurs</Typography>
                  <Typography variant="h5" fontWeight={700} color="#D32F2F">{rapport.lignes_erreur || 0}</Typography>
                </Paper>
              </Box>
            </Paper>
          ) : (
            <>
              <Paper
                variant="outlined"
                sx={{
                  p: 3, textAlign: "center", borderRadius: 2, borderStyle: "dashed", borderWidth: 2,
                  borderColor: fichier ? "primary.main" : "#BDBDBD",
                  bgcolor: fichier ? "#FFFDE7" : "#FAFAFA",
                  cursor: "pointer", "&:hover": { borderColor: "primary.dark", bgcolor: "#FFF8E1" },
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept=".xlsx, .xls, .csv" hidden onChange={handleFileChange} />
                <UploadFileIcon sx={{ fontSize: 44, color: "primary.dark", mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={600}>
                  {fichier ? fichier.name : "Cliquez ou glissez-déposez votre fichier Excel ici"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Formats acceptés : .xlsx, .xls, .csv
                </Typography>
              </Paper>

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
                sx={{ bgcolor: "primary.main", color: "#000000", fontWeight: 700, px: 3, "&:hover": { bgcolor: "primary.dark" } }}
              >
                {loading ? "Analyse..." : "Prévisualiser"}
              </Button>
            )}
            {etape === ETAPES.APERCU && (
              <Button
                variant="contained"
                disabled={loading || (rapport?.lignes_erreur > 0 && rapport.lignes_ok === 0)}
                startIcon={<CheckCircleIcon />}
                onClick={confirmer}
                sx={{ bgcolor: "primary.main", color: "#000000", fontWeight: 700, px: 3, "&:hover": { bgcolor: "primary.dark" } }}
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