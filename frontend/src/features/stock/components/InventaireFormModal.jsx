import { useEffect, useState } from "react";
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Typography,
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  IconButton,
  CircularProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Store as StoreIcon,
  Business as BusinessIcon,
  Inventory as InventoryIcon,
  ListAlt as ListAltIcon,
} from "@mui/icons-material";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../../constants/api";
import { useNotification } from "../../../components/common/NotificationProvider";
import { WizardDialog } from "../../../components/wizard/WizardDialog";
import { WizardActions } from "../../../components/wizard/WizardActions";
import { StyledTable } from "../../../components/wizard/StyledTable";
import { InfoBox } from "../../../components/wizard/InfoBox";
import { FormSection } from "../../../components/wizard/FormSection";
import { Autocomplete } from "@mui/material";
import { Chip } from "@mui/material";

const STEPS = [
  { label: "Lieu", icon: <StoreIcon /> },
  { label: "Articles", icon: <InventoryIcon /> },
  { label: "Récapitulatif", icon: <ListAltIcon /> },
];

export function InventaireFormModal({ isOpen, onClose, onSuccess, magasins, directions }) {
  const notify = useNotification();

  const [activeStep, setActiveStep] = useState(0);
  const [articles, setArticles] = useState([]);
  const [stocksTheoriques, setStocksTheoriques] = useState({});
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [lieuType, setLieuType] = useState("magasin");
  const [lieuId, setLieuId] = useState("");
  const [lignes, setLignes] = useState([]);
  const [currentArticle, setCurrentArticle] = useState(null);
  const [currentQuantite, setCurrentQuantite] = useState("");
  const [currentCommentaire, setCurrentCommentaire] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    apiClient
      .get(API_ENDPOINTS.ARTICLES, { params: { page_size: 500 } })
      .then((res) => setArticles(res.data.results ?? res.data))
      .catch(() => notify.error(ERROR_MESSAGES.LOAD_FAILED));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !lieuId) {
      setStocksTheoriques({});
      return;
    }
    if (lieuType === "magasin") {
      const fetchStocks = async () => {
        setLoadingStocks(true);
        try {
          const { data } = await apiClient.get(`${API_ENDPOINTS.MAGASINS}${lieuId}/stocks/`);
          setStocksTheoriques(data);
        } catch {
          notify.error("Impossible de calculer les stocks théoriques.");
          setStocksTheoriques({});
        } finally {
          setLoadingStocks(false);
        }
      };
      fetchStocks();
    } else {
      setStocksTheoriques({});
    }
  }, [isOpen, lieuId, lieuType]);

  useEffect(() => {
    if (!isOpen) return;
    setLieuType("magasin");
    setLieuId("");
    setLignes([]);
    setStocksTheoriques({});
    setCurrentArticle(null);
    setCurrentQuantite("");
    setCurrentCommentaire("");
    setActiveStep(0);
  }, [isOpen]);

  const resetCurrentArticle = () => {
    setCurrentArticle(null);
    setCurrentQuantite("");
    setCurrentCommentaire("");
  };

  const handleClose = () => {
    resetCurrentArticle();
    setLignes([]);
    setStocksTheoriques({});
    setActiveStep(0);
    onClose();
  };

  const lieuxDisponibles = lieuType === "magasin" ? magasins : directions;
  const lieuSelectionne = lieuxDisponibles.find((l) =>
    String(lieuType === "magasin" ? l.magasin_id : l.dir_id) === String(lieuId)
  );
  const lieuNom = lieuSelectionne
    ? lieuType === "magasin"
      ? lieuSelectionne.magasin_nom
      : lieuSelectionne.dir_libelle
    : "";

  const getStockTheorique = (articleCode) => stocksTheoriques[articleCode]?.stock_theorique ?? 0;

  const handleNext = () => {
    if (activeStep === 0 && !lieuId) {
      notify.error("Veuillez sélectionner un lieu.");
      return;
    }
    if (activeStep < STEPS.length - 1) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };

  const ajouterLigne = () => {
    if (!currentArticle) {
      notify.error("Veuillez sélectionner un article.");
      return;
    }
    if (!currentQuantite || Number(currentQuantite) < 0) {
      notify.error("Veuillez saisir une quantité physique valide (≥ 0).");
      return;
    }
    if (lignes.some((l) => l.article === currentArticle.code_article)) {
      notify.error("Cet article est déjà dans la liste.");
      return;
    }

    const quantiteTheorique = getStockTheorique(currentArticle.code_article);
    const quantitePhysique = Number(currentQuantite);
    setLignes([
      ...lignes,
      {
        article: currentArticle.code_article,
        article_designation: currentArticle.designation,
        quantite_theorique: quantiteTheorique,
        quantite_physique: quantitePhysique,
        ecart: quantitePhysique - quantiteTheorique,
        commentaire: currentCommentaire.trim(),
      },
    ]);
    resetCurrentArticle();
  };

  const retirerLigne = (index) => {
    setLignes(lignes.filter((_, i) => i !== index));
  };

  const getEcartColor = (ecart) => (ecart === 0 ? "success.main" : "error.main");
  const formatEcart = (ecart) => (ecart > 0 ? `+${ecart}` : String(ecart));

  const handleSubmit = async () => {
    if (lignes.length === 0) {
      notify.error("Ajoutez au moins un article à l'inventaire.");
      return;
    }
    if (!lieuId) {
      notify.error("Veuillez sélectionner un lieu.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        lignes: lignes.map((l) => ({
          article: l.article,
          quantite_physique: l.quantite_physique,
          commentaire: l.commentaire || null,
        })),
      };

      if (lieuType === "magasin") {
        payload.magasin = Number(lieuId);
      } else {
        payload.service = lieuId;
      }

      await apiClient.post(API_ENDPOINTS.INVENTAIRES, payload);
      notify.success("Inventaire enregistré avec succès");
      if (onSuccess) onSuccess();
      handleClose();
    } catch (err) {
      const detail = err?.response?.data;
      if (detail && typeof detail === "object") {
        notify.error(
          Object.entries(detail)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ")
        );
      } else {
        notify.error(ERROR_MESSAGES.SAVE_FAILED);
      }
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h3" sx={{ mb: 2 }}>Lieu de l'inventaire</Typography>
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <FormLabel component="legend">Type de lieu</FormLabel>
              <RadioGroup
                row
                value={lieuType}
                onChange={(e) => {
                  setLieuType(e.target.value);
                  setLieuId("");
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
                  value="direction"
                  control={<Radio color="primary" />}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <BusinessIcon fontSize="small" />
                      <span>Direction</span>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>{lieuType === "magasin" ? "Magasin" : "Direction"}</InputLabel>
              <Select
                value={lieuId}
                label={lieuType === "magasin" ? "Magasin" : "Direction"}
                onChange={(e) => setLieuId(e.target.value)}
              >
                <MenuItem value="">
                  Sélectionner un {lieuType === "magasin" ? "magasin" : "direction"}...
                </MenuItem>
                {lieuxDisponibles.map((l) => (
                  <MenuItem key={lieuType === "magasin" ? l.magasin_id : l.dir_id} value={lieuType === "magasin" ? l.magasin_id : l.dir_id}>
                    {lieuType === "magasin"
                      ? `${l.magasin_nom}${l.localite_nom ? ` (${l.localite_nom})` : ""}`
                      : l.dir_libelle}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {lieuSelectionne && (
              <InfoBox
                icon={lieuType === "magasin" ? <StoreIcon fontSize="small" /> : <BusinessIcon fontSize="small" />}
                title={lieuNom}
                subtitle={lieuType === "magasin" ? "Magasin" : "Direction"}
              />
            )}
            {loadingStocks && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Calcul des stocks théoriques en cours...
                </Typography>
              </Box>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h3" sx={{ mb: 2 }}>Articles à inventorier</Typography>
            <FormSection>
              <Autocomplete
                options={articles.filter((a) => !lignes.some((l) => l.article === a.code_article))}
                getOptionLabel={(option) => `${option.code_article} - ${option.designation}`}
                isOptionEqualToValue={(option, value) => option?.code_article === value?.code_article}
                value={currentArticle}
                onChange={(_, newValue) => setCurrentArticle(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Article" placeholder="Rechercher un article..." autoFocus />
                )}
                renderOption={(props, option) => {
                  const stockTheo = getStockTheorique(option.code_article);
                  return (
                    <li {...props} key={option.code_article}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {option.code_article} - {option.designation}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Stock théorique : {stockTheo}
                          {option.categorie_nom ? ` • ${option.categorie_nom}` : ""}
                        </Typography>
                      </Box>
                    </li>
                  );
                }}
                noOptionsText="Aucun article disponible"
              />
              {currentArticle && (
                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: "#FFFFFF", borderRadius: 1, border: "1px solid #E0E0E0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{currentArticle.designation}</Typography>
                    <Typography variant="caption" color="text.secondary">{currentArticle.code_article}</Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="caption" color="text.secondary">Stock théorique</Typography>
                    <Typography variant="body1" fontWeight={700} fontFamily="monospace" color="primary.main">
                      {getStockTheorique(currentArticle.code_article)}
                    </Typography>
                  </Box>
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
                />
                <TextField
                  label="Commentaire (optionnel)"
                  value={currentCommentaire}
                  onChange={(e) => setCurrentCommentaire(e.target.value)}
                  placeholder="Ex: 2 unités endommagées..."
                  inputProps={{ maxLength: 255 }}
                />
              </Box>
              {currentArticle && currentQuantite !== "" && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: "#FAFAFA", borderRadius: 1, border: "1px solid #E0E0E0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="body2">Aperçu :</Typography>
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <Typography variant="body2">
                      Théo : <strong>{getStockTheorique(currentArticle.code_article)}</strong>
                    </Typography>
                    <Typography variant="body2">
                      Physique : <strong>{currentQuantite || 0}</strong>
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      sx={{ color: getEcartColor(Number(currentQuantite || 0) - getStockTheorique(currentArticle.code_article)) }}
                    >
                      Écart : {formatEcart(Number(currentQuantite || 0) - getStockTheorique(currentArticle.code_article))}
                    </Typography>
                  </Box>
                </Box>
              )}
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={ajouterLigne}
                disabled={!currentArticle || !currentQuantite || Number(currentQuantite) < 0}
                sx={{ mt: 2 }}
              >
                Ajouter à la liste
              </Button>
            </FormSection>
            {lignes.length > 0 && (
              <StyledTable
                columns={[
                  { label: "Article" },
                  { label: "Qté théo", align: "center", width: 100 },
                  { label: "Qté physique", align: "center", width: 110 },
                  { label: "Écart", align: "center", width: 90 },
                  { label: "Commentaire", width: 160 },
                  { label: "", align: "center", width: 50 },
                ]}
              >
                {lignes.map((ligne, index) => (
                  <tr key={index}>
                    <td>
                      <Typography variant="body2" fontWeight={600}>{ligne.article}</Typography>
                      <Typography variant="caption" color="text.secondary">{ligne.article_designation}</Typography>
                    </td>
                    <td align="center">
                      <Typography variant="body2" fontFamily="monospace">{ligne.quantite_theorique}</Typography>
                    </td>
                    <td align="center">
                      <Typography variant="body2" fontWeight={600} fontFamily="monospace">{ligne.quantite_physique}</Typography>
                    </td>
                    <td align="center">
                      <Typography variant="body2" fontWeight={700} fontFamily="monospace" sx={{ color: getEcartColor(ligne.ecart) }}>
                        {formatEcart(ligne.ecart)}
                      </Typography>
                    </td>
                    <td>
                      {ligne.commentaire ? (
                        <Typography variant="body2" color="text.secondary">{ligne.commentaire}</Typography>
                      ) : (
                        <Chip label="—" size="small" variant="outlined" />
                      )}
                    </td>
                    <td align="center">
                      <IconButton size="small" color="error" onClick={() => retirerLigne(index)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </StyledTable>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h3" sx={{ mb: 2 }}>Récapitulatif de l'inventaire</Typography>
            <InfoBox
              icon={lieuType === "magasin" ? <StoreIcon fontSize="small" color="primary" /> : <BusinessIcon fontSize="small" color="primary" />}
            >
              <Typography variant="body2">
                <strong>Lieu : </strong> {lieuNom}
                <Chip label={lieuType === "magasin" ? "Magasin" : "Direction"} size="small" sx={{ ml: 1, height: 20, fontSize: 11 }} />
              </Typography>
            </InfoBox>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1, mt: 2 }}>
              Articles à inventorier ({lignes.length})
            </Typography>
            {lignes.length === 0 ? (
              <Box sx={{ p: 2, bgcolor: "#FFF8E1", borderRadius: 1 }}>
                <Typography variant="body2" color="primary.main">
                  ⚠️ Aucun article ajouté. Veuillez revenir en arrière pour en ajouter.
                </Typography>
              </Box>
            ) : (
              <StyledTable
                columns={[
                  { label: "Article" },
                  { label: "Qté théo", align: "center", width: 100 },
                  { label: "Qté physique", align: "center", width: 110 },
                  { label: "Écart", align: "center", width: 90 },
                  { label: "Commentaire", width: 160 },
                ]}
              >
                {lignes.map((ligne, index) => (
                  <tr key={index}>
                    <td>
                      <Typography variant="body2" fontWeight={600}>{ligne.article}</Typography>
                      <Typography variant="caption" color="text.secondary">{ligne.article_designation}</Typography>
                    </td>
                    <td align="center">
                      <Typography variant="body2" fontFamily="monospace">{ligne.quantite_theorique}</Typography>
                    </td>
                    <td align="center">
                      <Typography variant="body2" fontWeight={600} fontFamily="monospace">{ligne.quantite_physique}</Typography>
                    </td>
                    <td align="center">
                      <Typography variant="body2" fontWeight={700} fontFamily="monospace" sx={{ color: getEcartColor(ligne.ecart) }}>
                        {formatEcart(ligne.ecart)}
                      </Typography>
                    </td>
                    <td>
                      {ligne.commentaire || <Chip label="—" size="small" variant="outlined" />}
                    </td>
                  </tr>
                ))}
              </StyledTable>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <WizardDialog
      isOpen={isOpen}
      onClose={handleClose}
      steps={STEPS}
      activeStep={activeStep}
      title="Nouvel inventaire"
      mode="CRÉATION"
      actions={
        <WizardActions
          activeStep={activeStep}
          totalSteps={STEPS.length}
          onBack={handleBack}
          onNext={handleNext}
          onSubmit={handleSubmit}
          isLastStep={activeStep === STEPS.length - 1}
          loading={saving}
          submitLabel="Enregistrer l'inventaire"
          disabled={lignes.length === 0 || !lieuId}
        />
      }
    >
      {renderStepContent()}
    </WizardDialog>
  );
}