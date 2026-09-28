import { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  Stack,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControlLabel,
  Checkbox,
  LinearProgress,
  Divider,
} from "@mui/material";
import {
  UploadFile as UploadFileIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  RestartAlt as RestartAltIcon,
  Dataset as DatasetIcon,
} from "@mui/icons-material";
import * as XLSX from "xlsx";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS } from "../../../constants/api";

const DEMO_EMPLOYEES_SAMPLE = [
  {
    matricule: "M-9001",
    nom: "RABENANTOANDRO Faly",
    fonction: "Chef de Centre Principal",
    contact: "034 05 901 01",
    email: "faly.rabenantoandro@paositra.mg",
    direction: "Direction de l'Exploitation",
    service: "Courrier & Colis Express",
    site: "Centre de Tri Postal Alarobia",
    statut: "ACTIF",
  },
  {
    matricule: "M-9002",
    nom: "RAKOTONDRATSIMBA Aina",
    fonction: "Ingénieure Systèmes & Cloud",
    contact: "032 11 902 02",
    email: "aina.rakotondratsimba@paositra.mg",
    direction: "Direction des Systèmes d'Information",
    service: "Support IT",
    site: "Direction Générale Antaninarenina",
    statut: "ACTIF",
  },
  {
    matricule: "M-9003",
    nom: "ANDRIAMANAMPISOA Lova",
    fonction: "Auditeur Comptable Interne",
    contact: "033 44 903 03",
    email: "lova.andriamanampisoa@paositra.mg",
    direction: "Direction Financière et Comptable",
    service: "Comptabilité Générale",
    site: "Direction Générale Antaninarenina",
    statut: "ACTIF",
  },
  {
    matricule: "M-9004",
    nom: "RASOARIMALALA Haingo",
    fonction: "Responsable Approvisionnements",
    contact: "034 22 904 04",
    email: "haingo.rasoarimalala@paositra.mg",
    direction: "Direction de l'Exploitation",
    service: "Logistique & Magasins",
    site: "Centre de Tri Postal Alarobia",
    statut: "ACTIF",
  },
  {
    matricule: "M-9005",
    nom: "RANDRIAMIFIDY Toky",
    fonction: "Technicien Réseaux & Sécurité",
    contact: "032 88 905 05",
    email: "toky.randriamifidy@paositra.mg",
    direction: "Direction des Systèmes d'Information",
    service: "Réseaux & Télécoms",
    site: "Direction Générale Antaninarenina",
    statut: "ACTIF",
  },
  {
    matricule: "M-9006",
    nom: "RAZAFINDRABE Mamy",
    fonction: "Chef d'Agence Toamasina",
    contact: "034 77 906 06",
    email: "mamy.razafindrabe@paositra.mg",
    direction: "Direction de l'Exploitation",
    service: "Courrier & Colis Express",
    site: "Agence Principale Toamasina",
    statut: "ACTIF",
  },
  {
    matricule: "M-9007",
    nom: "RAVELOMANANTSOA Dina",
    fonction: "Gestionnaire des Talents & Recrutement",
    contact: "033 12 907 07",
    email: "dina.ravelo@paositra.mg",
    direction: "Direction Générale",
    service: "Ressources Humaines",
    site: "Direction Générale Antaninarenina",
    statut: "ACTIF",
  },
  {
    matricule: "M-9008",
    nom: "SOLOFONIAINA Eric",
    fonction: "Chargé Grands Comptes Entreprises",
    contact: "034 99 908 08",
    email: "eric.solofo@paositra.mg",
    direction: "Direction Commerciale & Marketing",
    service: "Ventes & Communication",
    site: "Direction Générale Antaninarenina",
    statut: "ACTIF",
  },
];

export function EmployeeImportDialog({ open, onClose, onImportSuccess }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [overwrite, setOverwrite] = useState(true);
  const [resultReport, setResultReport] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const resetAll = () => {
    setFile(null);
    setParsedRows([]);
    setLoading(false);
    setImporting(false);
    setResultReport(null);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (importing) return;
    resetAll();
    onClose();
  };

  // Normalisation des colonnes importées
  const normalizeRow = (raw) => {
    const keys = Object.keys(raw);
    const findVal = (keywords) => {
      for (const k of keys) {
        const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, "");
        for (const kw of keywords) {
          if (cleanK.includes(kw)) {
            return raw[k];
          }
        }
      }
      return "";
    };

    const nom = findVal(["nom", "prenom", "collaborateur", "agent"]) || raw["nom"] || "";
    const matricule = findVal(["matricule", "mle", "mat", "badge", "id"]) || raw["matricule"] || "";
    const fonction = findVal(["fonction", "poste", "titre", "role", "metier"]) || raw["fonction"] || "Agent";
    const contact = findVal(["contact", "tel", "phone", "portable", "mobile"]) || raw["contact"] || "";
    const email = findVal(["email", "mail", "courriel"]) || raw["email"] || "";
    const service = findVal(["serv", "unite", "departement"]) || raw["service"] || "";
    const direction = findVal(["dir", "direction", "division"]) || raw["direction"] || "";
    const site = findVal(["site", "agence", "etablissement", "lieu", "localite", "bureau"]) || raw["site"] || "";
    const statut = findVal(["statut", "etat"]) || raw["statut"] || "ACTIF";

    return {
      nom: String(nom || "").trim(),
      matricule: String(matricule || "").trim(),
      fonction: String(fonction || "Agent").trim(),
      contact: String(contact || "").trim(),
      email: String(email || "").trim(),
      service: String(service || "").trim(),
      direction: String(direction || "").trim(),
      site: String(site || "").trim(),
      statut: String(statut || "ACTIF").toUpperCase() === "INACTIF" ? "INACTIF" : "ACTIF",
    };
  };

  // Traiter un fichier sélectionné
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrorMsg("");
    setLoading(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(sheet);

      if (!json || json.length === 0) {
        throw new Error("Le fichier importé est vide ou non lisible.");
      }

      const rows = json.map(normalizeRow).filter((r) => r.nom || r.matricule);
      if (rows.length === 0) {
        throw new Error("Aucun employé valide trouvé. Vérifiez les en-têtes (Nom, Matricule, Fonction, etc.)");
      }

      setParsedRows(rows);
    } catch (err) {
      setErrorMsg(err.message || "Erreur lors de l'analyse du fichier Excel/CSV.");
      setParsedRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Charger le jeu de test
  const handleLoadSample = () => {
    setFile({ name: "donnees_employes_paositra_sample.xlsx", size: 4500 });
    setParsedRows(DEMO_EMPLOYEES_SAMPLE);
    setErrorMsg("");
  };

  // Télécharger le modèle Excel / CSV
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Matricule": "M-8101",
        "Nom et Prénom": "RAZAFINDRABE Jean",
        "Fonction": "Responsable Agence",
        "Contact": "034 11 000 01",
        "Email": "jean.razafindrabe@paositra.mg",
        "Site": "Direction Générale Antaninarenina",
        "Direction": "Direction de l'Exploitation",
        "Service": "Courrier & Colis Express",
        "Statut": "ACTIF",
      },
      {
        "Matricule": "M-8102",
        "Nom et Prénom": "RASOLO Marie",
        "Fonction": "Technicienne Maintenance",
        "Contact": "032 55 000 02",
        "Email": "marie.rasolo@paositra.mg",
        "Site": "Centre de Tri Postal Alarobia",
        "Direction": "Direction des Systèmes d'Information",
        "Service": "Support IT",
        "Statut": "ACTIF",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Modele_Employes");
    XLSX.writeFile(workbook, "modele_import_employes_paositra.xlsx");
  };

  // Lancer l'import vers le serveur
  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;

    setImporting(true);
    setErrorMsg("");

    try {
      const payload = {
        employees: parsedRows.map((r) => ({
          emp_nom: r.nom,
          emp_matricule: r.matricule,
          emp_fonction: r.fonction,
          emp_contact: r.contact,
          emp_email: r.email,
          service_libelle: r.service,
          direction_libelle: r.direction,
          site_nom: r.site,
          statut: r.statut,
        })),
        overwrite,
      };

      const { data } = await apiClient.post(API_ENDPOINTS.EMPLOYEES_IMPORT, payload);
      setResultReport(data);
      if (onImportSuccess) {
        onImportSuccess(data);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Erreur lors de l'enregistrement de l'import.";
      setErrorMsg(msg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 2.5, px: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 1.5,
                bgcolor: "#E3F2FD",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#1565C0",
              }}
            >
              <UploadFileIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Importer un fichier d'employés existants
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Intégrez rapidement vos listes de personnel depuis un fichier Excel (.xlsx, .xls) ou CSV
              </Typography>
            </Box>
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadTemplate}
            sx={{ textTransform: "none", fontSize: 12 }}
          >
            Modèle Excel
          </Button>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          {/* Rapport de résultat après succès */}
          {resultReport ? (
            <Paper sx={{ p: 3, bgcolor: "#F1F8E9", border: "1px solid #C8E6C9", borderRadius: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                <CheckCircleIcon sx={{ color: "#2E7D32", fontSize: 36 }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} color="#1B5E20">
                    Importation terminée avec succès !
                  </Typography>
                  <Typography variant="body2" color="#2E7D32">
                    {resultReport.message || "Toutes les données ont été synchronisées dans le registre."}
                  </Typography>
                </Box>
              </Box>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={4}>
                  <Paper sx={{ p: 1.5, textAlign: "center", bgcolor: "#FFFFFF" }}>
                    <Typography variant="caption" color="text.secondary">
                      Nouveaux employés
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="#2E7D32">
                      +{resultReport.importes || 0}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 1.5, textAlign: "center", bgcolor: "#FFFFFF" }}>
                    <Typography variant="caption" color="text.secondary">
                      Mis à jour
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="#0288D1">
                      {resultReport.mis_a_jour || 0}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 1.5, textAlign: "center", bgcolor: "#FFFFFF" }}>
                    <Typography variant="caption" color="text.secondary">
                      Effectif total
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="#F57F17">
                      {resultReport.count_total || parsedRows.length}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Paper>
          ) : (
            <>
              {/* Zone de téléversement et actions d'aide */}
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  textAlign: "center",
                  borderRadius: 2,
                  borderStyle: "dashed",
                  borderWidth: 2,
                  borderColor: parsedRows.length > 0 ? "primary.main" : "#BDBDBD",
                  bgcolor: parsedRows.length > 0 ? "#FFFDE7" : "#FAFAFA",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": { borderColor: "primary.dark", bgcolor: "#FFF8E1" },
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  hidden
                  onChange={handleFileChange}
                />
                <UploadFileIcon sx={{ fontSize: 44, color: "primary.dark", mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={600}>
                  {file ? file.name : "Cliquez ou glissez-déposez votre fichier Excel ou CSV ici"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Formats acceptés : .xlsx, .xls, .csv (taille max 10 Mo)
                </Typography>
              </Paper>

              {/* Bouton de secours / Données exemple */}
              {parsedRows.length === 0 && (
                <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<DatasetIcon />}
                    onClick={handleLoadSample}
                    sx={{ textTransform: "none", color: "text.secondary" }}
                  >
                    Ou charger un échantillon de test (8 collaborateurs types)
                  </Button>
                </Box>
              )}

              {loading && <LinearProgress color="primary" />}

              {errorMsg && (
                <Alert severity="error" onClose={() => setErrorMsg("")}>
                  {errorMsg}
                </Alert>
              )}

              {/* Tableau de prévisualisation si des lignes sont détectées */}
              {parsedRows.length > 0 && (
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      Aperçu des données ({parsedRows.length} employés détectés)
                    </Typography>
                    <Button
                      size="small"
                      color="inherit"
                      startIcon={<RestartAltIcon fontSize="small" />}
                      onClick={resetAll}
                      sx={{ textTransform: "none", fontSize: 12 }}
                    >
                      Changer de fichier
                    </Button>
                  </Box>

                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 260 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Matricule</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Nom & Prénom</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Fonction</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Service</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Direction</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Site</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {parsedRows.map((r, i) => (
                          <TableRow key={i} hover>
                            <TableCell>
                              <Chip
                                label={r.matricule || "Auto"}
                                size="small"
                                sx={{ fontWeight: 600, fontSize: 11 }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{r.nom}</TableCell>
                            <TableCell>{r.fonction}</TableCell>
                            <TableCell>{r.service || "-"}</TableCell>
                            <TableCell>{r.direction || "-"}</TableCell>
                            <TableCell>{r.site || "-"}</TableCell>
                            <TableCell sx={{ fontSize: 11, color: "text.secondary" }}>
                              {r.contact || r.email || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Options d'import */}
                  <Box sx={{ mt: 1.5, p: 1.5, bgcolor: "#FAFAFA", borderRadius: 1.5 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={overwrite}
                          onChange={(e) => setOverwrite(e.target.checked)}
                          color="primary"
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2">
                          Mettre à jour les données des employés existants si le matricule correspond
                        </Typography>
                      }
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
        <Button onClick={handleClose} disabled={importing} color="inherit">
          {resultReport ? "Fermer" : "Annuler"}
        </Button>

        {!resultReport && (
          <Button
            variant="contained"
            disabled={parsedRows.length === 0 || importing || loading}
            startIcon={<PlayArrowIcon />}
            onClick={handleExecuteImport}
            sx={{
              bgcolor: "primary.main",
              color: "#000000",
              fontWeight: 700,
              px: 3,
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            {importing
              ? "Importation en cours..."
              : `Importer ${parsedRows.length} employé${parsedRows.length > 1 ? "s" : ""}`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
