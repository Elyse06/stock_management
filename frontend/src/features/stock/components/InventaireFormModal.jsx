import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Autocomplete,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
} from "@mui/material";
import {
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Store as StoreIcon,
  Business as BusinessIcon,
  Inventory as InventoryIcon,
  ListAlt as ListAltIcon,
} from "@mui/icons-material";
import { apiClient } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";

// ====== CONSTANTES ======
const STEPS = [
  { label: "Lieu", icon: <StoreIcon /> },
  { label: "Articles", icon: <InventoryIcon /> },
  { label: "Récapitulatif", icon: <ListAltIcon /> },
];

export function InventaireFormModal({ isOpen, onClose, onSuccess, magasins, services }) {
  const { hasAction } = useAuth();

  // TODO: Implémenter les permissions réelles avec hasAction
  // Exemple: const canCreate = hasAction('INV_GERE');
  const canCreate = true;

  // ====== STATE WIZARD ======
  const [activeStep, setActiveStep] = useState(0);

  // ====== DONNÉES DE RÉFÉRENCE ======
  const [articles, setArticles] = useState([]);

  // ====== ÉTAPE 1 : LIEU ======
  const [lieuType, setLieuType] = useState("magasin"); // "magasin" | "service"
  const [lieuId, setLieuId] = useState("");

  // ====== ÉTAPE 2 : ARTICLES ======
  const [lignes, setLignes] = useState([]);
  const [currentArticle, setCurrentArticle] = useState(null);
  const [currentQuantite, setCurrentQuantite] = useState("");
  const [currentCommentaire, setCurrentCommentaire] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // ====== CHARGEMENT DES ARTICLES ======
  useEffect(() => {
    if (!isOpen) return;
    apiClient
      .get("/api/catalogue/articles/", { params: { page_size: 500 } })
      .then((res) => setArticles(res.data.results ?? res.data))
      .catch(() => setError("Impossible de charger les articles."));
  }, [isOpen]);

  // ====== RESET À L'OUVERTURE ======
  useEffect(() => {
    if (!isOpen) return;
    setLieuType("magasin");
    setLieuId("");
    setLignes([]);
    setCurrentArticle(null);
    setCurrentQuantite("");
    setCurrentCommentaire("");
    setActiveStep(0);
    setError("");
  }, [isOpen]);

  // ====== HELPERS ======
  const resetCurrentArticle = () => {
    setCurrentArticle(null);
    setCurrentQuantite("");
    setCurrentCommentaire("");
  };

  const handleClose = () => {
    resetCurrentArticle();
    setLignes([]);
    setError("");
    setActiveStep(0);
    onClose();
  };

  const lieuxDisponibles = lieuType === "magasin" ? magasins : services;
  const lieuSelectionne = lieuxDisponibles.find((l) =>
    String(lieuType === "magasin" ? l.magasin_id : l.serv_id) === String(lieuId)
  );
  const lieuNom = lieuSelectionne
    ? lieuType === "magasin"
      ? lieuSelectionne.magasin_nom
      : lieuSelectionne.serv_libelle
    : "";

  // ====== NAVIGATION ======
  const handleNext = () => {
    setError("");

    if (activeStep === 0 && !lieuId) {
      setError("Veuillez sélectionner un lieu.");
      return;
    }

    if (activeStep < STEPS.length - 1) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setError("");
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };

  // ====== GESTION DES LIGNES ======
  const ajouterLigne = () => {
    if (!currentArticle) {
      setError("Veuillez sélectionner un article.");
      return;
    }
    if (!currentQuantite || Number(currentQuantite) < 0) {
      setError("Veuillez saisir une quantité physique valide (≥ 0).");
      return;
    }

    // Vérifier si l'article est déjà dans la liste
    if (lignes.some((l) => l.article === currentArticle.code_article)) {
      setError("Cet article est déjà dans la liste.");
      return;
    }

    setLignes([
      ...lignes,
      {
        article: currentArticle.code_article,
        article_designation: currentArticle.designation,
        quantite_physique: Number(currentQuantite),
        commentaire: currentCommentaire.trim(),
      },
    ]);
    setError("");
    resetCurrentArticle();
  };

  const retirerLigne = (index) => {
    setLignes(lignes.filter((_, i) => i !== index));
  };

  // ====== ENREGISTREMENT ======
  const handleSubmit = async () => {
    if (lignes.length === 0) {
      setError("Ajoutez au moins un article à l'inventaire.");
      return;
    }
    if (!lieuId) {
      setError("Veuillez sélectionner un lieu.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        lignes: lignes.map((l) => ({
          article: l.article,
          quantite_physique: l.quantite_physique,
          commentaire: l.commentaire || null,
        })),
      };

      // ✅ Magasin OU Service (exclusif)
      if (lieuType === "magasin") {
        payload.magasin = Number(lieuId);
      } else {
        payload.service = Number(lieuId);
      }

      await apiClient.post("/api/stock/inventaires/", payload);

      if (onSuccess) onSuccess();
      handleClose();
    } catch (err) {
      const detail = err?.response?.data;
      if (detail && typeof detail === "object") {
        setError(
          Object.entries(detail)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ")
        );
      } else {
        setError("Erreur lors de l'enregistrement de l'inventaire.");
      }
    } finally {
      setSaving(false);
    }
  };

  // ====== RENDU DES ÉTAPES ======
  const renderStepContent = () => {
    switch (activeStep) {
      // ====== ÉTAPE 1 : LIEU ======
      case 0:
        return (
          <Box>
            <Typography variant="h3" sx={{ mb: 2 }}>
              Lieu de l'inventaire
            </Typography>

            {/* Choix du type de lieu */}
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <FormLabel component="legend">Type de lieu</FormLabel>
              <RadioGroup
                row
                value={lieuType}
                onChange={(e) => {
                  setLieuType(e.target.value);
                  setLieuId(""); // Reset du lieu sélectionné
                }}
              >
                <FormControlLabel
                  value="magasin"
                  control={<Radio color="primary" />}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <StoreIcon fontSize="small" />
                      <span>Magasin</span>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="service"
                  control={<Radio color="primary" />}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <BusinessIcon fontSize="small" />
                      <span>Département</span>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>

            {/* Sélection du lieu spécifique */}
            <FormControl fullWidth>
              <InputLabel>
                {lieuType === "magasin" ? "Magasin" : "Département"}
              </InputLabel>
              <Select
                value={lieuId}
                label={lieuType === "magasin" ? "Magasin" : "Département"}
                onChange={(e) => setLieuId(e.target.value)}
              >
                <MenuItem value="">
                  Sélectionner un {lieuType === "magasin" ? "magasin" : "département"}...
                </MenuItem>
                {lieuxDisponibles.map((l) => (
                  <MenuItem
                    key={lieuType === "magasin" ? l.magasin_id : l.serv_id}
                    value={lieuType === "magasin" ? l.magasin_id : l.serv_id}
                  >
                    {lieuType === "magasin"
                      ? `${l.magasin_nom}${l.localite ? ` (${l.localite})` : ""}`
                      : l.serv_libelle}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {lieuSelectionne && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: "#FFF8E1",
                  borderRadius: 1,
                  border: "1px solid #F9A825",
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {lieuNom}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {lieuType === "magasin" ? "Magasin" : "Département"}
                  {lieuType === "magasin" && lieuSelectionne.localite
                    ? ` • ${lieuSelectionne.localite}`
                    : ""}
                </Typography>
              </Box>
            )}
          </Box>
        );

      // ====== ÉTAPE 2 : ARTICLES ======
      case 1:
        return (
          <Box>
            <Typography variant="h3" sx={{ mb: 2 }}>
              Articles à inventorier
            </Typography>

            {/* Formulaire d'ajout */}
            <Box
              sx={{
                p: 2,
                bgcolor: "#FAFAFA",
                borderRadius: 1,
                border: "1px dashed #E0E0E0",
                mb: 2,
              }}
            >
              <Autocomplete
                options={articles.filter(
                  (a) => !lignes.some((l) => l.article === a.code_article)
                )}
                getOptionLabel={(option) =>
                  `${option.code_article} - ${option.designation}`
                }
                isOptionEqualToValue={(option, value) =>
                  option?.code_article === value?.code_article
                }
                value={currentArticle}
                onChange={(_, newValue) => setCurrentArticle(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Article"
                    placeholder="Rechercher un article..."
                    autoFocus
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.code_article}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {option.code_article} - {option.designation}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Stock théorique : {option.stock_calcule ?? 0}
                        {option.categorie_nom ? ` • ${option.categorie_nom}` : ""}
                      </Typography>
                    </Box>
                  </li>
                )}
                noOptionsText="Aucun article disponible"
              />

              {currentArticle && (
                <Box
                  sx={{
                    mt: 1.5,
                    p: 1.5,
                    bgcolor: "#FFFFFF",
                    borderRadius: 1,
                    border: "1px solid #E0E0E0",
                  }}
                >
                  <Typography variant="body2" fontWeight={600}>
                    {currentArticle.designation}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Stock théorique actuel : {currentArticle.stock_calcule ?? 0}
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 2, mt: 2 }}>
                <TextField
                  label="Quantité physique comptée"
                  type="number"
                  value={currentQuantite}
                  onChange={(e) => setCurrentQuantite(e.target.value)}
                  inputProps={{ min: 0, step: 1 }}
                  placeholder="0"
                  helperText="Nombre réel compté"
                />
                <TextField
                  label="Commentaire (optionnel)"
                  value={currentCommentaire}
                  onChange={(e) => setCurrentCommentaire(e.target.value)}
                  placeholder="Ex: 2 unités endommagées..."
                  inputProps={{ maxLength: 255 }}
                />
              </Box>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={ajouterLigne}
                disabled={!currentArticle || !currentQuantite || Number(currentQuantite) < 0}
                sx={{ mt: 2 }}
              >
                Ajouter à la liste
              </Button>
            </Box>

            {/* Liste des articles ajoutés */}
            {lignes.length > 0 && (
              <Table
                size="small"
                sx={{
                  border: "1px solid #E0E0E0",
                  "& .MuiTableCell-root": {
                    borderColor: "#E0E0E0",
                    py: 1,
                    px: 1.5,
                  },
                  "& .MuiTableHead-root .MuiTableCell-root": {
                    bgcolor: "#FFF8E1",
                    fontWeight: 600,
                    fontSize: 13,
                    borderBottom: "2px solid #F9A825",
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>Article</TableCell>
                    <TableCell align="center" sx={{ width: 120 }}>
                      Qté physique
                    </TableCell>
                    <TableCell sx={{ width: 180 }}>Commentaire</TableCell>
                    <TableCell align="center" sx={{ width: 60 }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lignes.map((ligne, index) => (
                    <TableRow key={index} sx={{ "&:hover": { bgcolor: "#FFFDE7" } }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {ligne.article}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ligne.article_designation}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                          {ligne.quantite_physique}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {ligne.commentaire ? (
                          <Typography variant="body2" color="text.secondary">
                            {ligne.commentaire}
                          </Typography>
                        ) : (
                          <Chip label="—" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => retirerLigne(index)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <Alert severity="info" sx={{ mt: 2 }}>
              💡 Le stock théorique et l'écart seront calculés automatiquement par le système
              lors de l'enregistrement.
            </Alert>
          </Box>
        );

      // ====== ÉTAPE 3 : RÉCAPITULATIF ======
      case 2:
        return (
          <Box>
            <Typography variant="h3" sx={{ mb: 2 }}>
              Récapitulatif de l'inventaire
            </Typography>

            {/* Lieu */}
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                bgcolor: "#FFF8E1",
                borderRadius: 1,
                border: "1px solid #F9A825",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              {lieuType === "magasin" ? (
                <StoreIcon fontSize="small" color="primary" />
              ) : (
                <BusinessIcon fontSize="small" color="primary" />
              )}
              <Typography variant="body2">
                <strong>Lieu :</strong> {lieuNom}
                <Chip
                  label={lieuType === "magasin" ? "Magasin" : "Département"}
                  size="small"
                  sx={{ ml: 1, height: 20, fontSize: 11 }}
                />
              </Typography>
            </Box>

            {/* Articles */}
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
              Articles à inventorier ({lignes.length})
            </Typography>

            {lignes.length === 0 ? (
              <Alert severity="warning">
                Aucun article ajouté. Veuillez revenir en arrière pour en ajouter.
              </Alert>
            ) : (
              <Table
                size="small"
                sx={{
                  mb: 2,
                  border: "1px solid #E0E0E0",
                  "& .MuiTableCell-root": {
                    borderColor: "#E0E0E0",
                    py: 1,
                    px: 1.5,
                  },
                  "& .MuiTableHead-root .MuiTableCell-root": {
                    bgcolor: "#FFF8E1",
                    fontWeight: 600,
                    fontSize: 13,
                    borderBottom: "2px solid #F9A825",
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>Article</TableCell>
                    <TableCell align="center" sx={{ width: 120 }}>
                      Qté physique
                    </TableCell>
                    <TableCell sx={{ width: 180 }}>Commentaire</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lignes.map((ligne, index) => (
                    <TableRow key={index} sx={{ "&:hover": { bgcolor: "#FFFDE7" } }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {ligne.article}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ligne.article_designation}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                          {ligne.quantite_physique}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {ligne.commentaire || <Chip label="—" size="small" variant="outlined" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  // ====== BOUTONS D'ACTION SELON L'ÉTAPE ======
  const renderActions = () => {
    if (activeStep === STEPS.length - 1) {
      return (
        <>
          <Button onClick={handleBack} startIcon={<ArrowBackIcon />}>
            Précédent
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving || lignes.length === 0 || !lieuId}
            startIcon={
              saving ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
          >
            {saving ? "Enregistrement..." : "Enregistrer l'inventaire"}
          </Button>
        </>
      );
    }

    return (
      <>
        {activeStep > 0 && (
          <Button onClick={handleBack} startIcon={<ArrowBackIcon />}>
            Précédent
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          onClick={handleNext}
          endIcon={<ArrowForwardIcon />}
        >
          Suivant
        </Button>
      </>
    );
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2, minHeight: 500 } }}
    >
      {/* ====== HEADER ====== */}
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "#FFF8E1",
          borderBottom: "2px solid",
          borderColor: "primary.main",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              bgcolor: "success.main",
              color: "white",
              borderRadius: 1,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            CRÉATION
          </Box>
          <Typography variant="h3">Nouvel inventaire</Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* ====== STEPPER ====== */}
      <Box sx={{ px: 3, pt: 3, pb: 1 }}>
        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{
            "& .MuiStepIcon-root.Mui-completed": { color: "primary.main" },
            "& .MuiStepIcon-root.Mui-active": { color: "primary.main" },
            "& .MuiStepLabel-label.Mui-active": {
              color: "primary.main",
              fontWeight: 600,
            },
          }}
        >
          {STEPS.map((step, index) => (
            <Step key={index}>
              <StepLabel>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>
      <Divider />

      {/* ====== CONTENU DE L'ÉTAPE ====== */}
      <DialogContent sx={{ pt: 3, minHeight: 300 }}>
        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {renderStepContent()}
      </DialogContent>

      {/* ====== ACTIONS ====== */}
      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>{renderActions()}</DialogActions>
    </Dialog>
  );
}