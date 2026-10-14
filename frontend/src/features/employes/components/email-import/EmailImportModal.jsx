import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel,
  LinearProgress, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from "@mui/material";
import {
  AlternateEmail as AlternateEmailIcon, CheckCircle as CheckCircleIcon, Download as DownloadIcon,
  PlayArrow as PlayArrowIcon, RestartAlt as RestartAltIcon,
} from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";

import { FileDropZone } from "@/components/import/FileDropZone";
import { ImportResultCard } from "@/components/import/ImportResultCard";
import { exportToCSV } from "@/utils/export";

import { EXTENSIONS_EMAILS, useImportEmails } from "../../hooks/useImportEmails";

import { IdentifiantsCrees } from "./IdentifiantsCrees";

const MODELE = ["Adresse électronique", "Prénom et nom", "Type", "Matricule"];
const EXEMPLE = { "Adresse électronique": "jean.rakoto@paositra.mg", "Prénom et nom": "RAKOTO Jean", Type: "Agent", Matricule: "8101" };
const COULEUR = { ERREUR: "error", "IGNORÉ": "default", "CRÉÉ": "success", "MIS À JOUR": "info", "RATTACHÉ": "info" };

export function EmailImportModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const { fichier, rapport, etape, loading, erreur, overwrite, setOverwrite, ETAPES, choisirFichier, previsualiser, confirmer } =
    useImportEmails();
  const identifiants = etape === ETAPES.CONFIRME ? rapport?.identifiants || [] : [];

  const fermer = () => {
    if (loading) return;
    choisirFichier(null);
    onClose();
  };

  const confirmerImport = async () => {
    if (await confirmer()) {
      ["employees", "utilisateurs", "options"].forEach((cle) => queryClient.invalidateQueries({ queryKey: [cle] }));
    }
  };

  return (
    <Dialog open={isOpen} onClose={fermer} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 2 } } }}>
      <DialogTitle sx={{ pb: 1, pt: 2.5, px: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: 1.5, bgcolor: "#FFF8E1", display: "grid", placeItems: "center", color: "primary.dark" }}>
              <AlternateEmailIcon />
            </Box>
            <Box>
              <Typography variant="h6" component="span" fontWeight={700} sx={{ display: "block" }}>
                Importer les adresses de connexion
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Associe une adresse électronique de connexion à chaque employé, retrouvé par son matricule
              </Typography>
            </Box>
          </Box>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} sx={{ textTransform: "none", fontSize: 12 }}
            onClick={() => exportToCSV([EXEMPLE], "modele_import_adresses", MODELE.map((c) => ({ label: c, field: c })))}>
            Modèle CSV
          </Button>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          {etape === ETAPES.CONFIRME && rapport ? (
            <>
              <ImportResultCard rapport={rapport} libelle="compte(s)" />
              {identifiants.length > 0 && <IdentifiantsCrees identifiants={identifiants} motDePasse={rapport.mot_de_passe_temporaire} />}
            </>
          ) : (
            <>
              <FileDropZone fichier={fichier} onChoisir={choisirFichier} disabled={loading} extensions={EXTENSIONS_EMAILS} />
              {loading && <LinearProgress />}
              {erreur && <Alert severity="error">{erreur}</Alert>}
              {rapport && etape === ETAPES.APERCU && (
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      Aperçu : {rapport.lignes_ok || 0} ligne(s) valide(s), {rapport.lignes_erreur || 0} en erreur
                    </Typography>
                    <Button size="small" startIcon={<RestartAltIcon />} onClick={() => choisirFichier(null)} sx={{ textTransform: "none", fontSize: 12 }}>
                      Changer
                    </Button>
                  </Box>
                  {rapport.colonnes_manquantes?.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 2 }}>Colonnes manquantes : {rapport.colonnes_manquantes.join(", ")}</Alert>
                  )}
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 280 }}>
                    <Table size="small" stickyHeader aria-label="Aperçu de l'import des adresses">
                      <TableHead>
                        <TableRow>
                          {["Ligne", "Matricule", "Employé", "Adresse électronique", "Statut", "Détail"].map((t) => (
                            <TableCell key={t} sx={{ fontWeight: 700 }}>{t}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(rapport.details || []).slice(0, 100).map((r) => (
                          <TableRow key={r.ligne} hover>
                            <TableCell>{r.ligne}</TableCell>
                            <TableCell>{r.matricule || "—"}</TableCell>
                            <TableCell>{r.nom || "—"}</TableCell>
                            <TableCell sx={{ wordBreak: "break-all" }}>{r.email || "—"}</TableCell>
                            <TableCell><Chip label={r.statut} size="small" color={COULEUR[r.statut] || "default"} sx={{ fontSize: 11 }} /></TableCell>
                            <TableCell>
                              <Typography variant="caption" color={r.statut === "ERREUR" ? "error" : "text.secondary"}>{r.message}</Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box sx={{ mt: 1.5, p: 1.5, bgcolor: "#FAFAFA", borderRadius: 1.5 }}>
                    <FormControlLabel
                      control={<Checkbox checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} size="small" />}
                      label={<Typography variant="body2">Remplacer l'adresse des employés qui ont déjà un compte</Typography>}
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
        <Button onClick={fermer} disabled={loading} color="inherit">
          {etape === ETAPES.CONFIRME ? "Fermer" : "Annuler"}
        </Button>
        {etape === ETAPES.CHOIX && fichier && (
          <Button variant="contained" disabled={loading} startIcon={<PlayArrowIcon />} onClick={previsualiser} sx={{ fontWeight: 700, px: 3 }}>
            {loading ? "Analyse..." : "Prévisualiser"}
          </Button>
        )}
        {etape === ETAPES.APERCU && (
          <Button variant="contained" disabled={loading || !(rapport?.lignes_ok > 0)} startIcon={<CheckCircleIcon />}
            onClick={confirmerImport} sx={{ fontWeight: 700, px: 3 }}>
            {loading ? "Importation..." : `Confirmer l'import (${rapport?.lignes_ok || 0})`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
