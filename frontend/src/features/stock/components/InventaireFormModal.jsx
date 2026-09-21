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
  Checkbox,
  Chip,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Store as StoreIcon,
  Business as BusinessIcon,
  Inventory as InventoryIcon,
  ListAlt as ListAltIcon,
  SwapHoriz as SwapHorizIcon,
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
import { PropositionsSeriesEditor } from "./PropositionsSeriesEditor";

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
  const [currentPropositions, setCurrentPropositions] = useState({});
  const [showChangementEtat, setShowChangementEtat] = useState(false);
  const [unitesExistantes, setUnitesExistantes] = useState([]);
  const [loadingUnites, setLoadingUnites] = useState(false);
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

  // 🆕 Charger les unités existantes si l'article est une immobilisation
  useEffect(() => {
    if (!isOpen || !currentArticle || !currentArticle.is_immobilisation) {
      setUnitesExistantes([]);
      return;
    }
    setLoadingUnites(true);
    apiClient
      .get("/api/stock/unites-article/", {
        params: { article: currentArticle.code_article, statut: "EN_STOCK", page_size: 500 },
      })
      .then((res) => setUnitesExistantes(res.data.results ?? res.data))
      .catch(() => notify.error("Impossible de charger les unités en stock."))
      .finally(() => setLoadingUnites(false));
  }, [isOpen, currentArticle]);

  useEffect(() => {
    if (!isOpen) return;
    setLieuType("magasin");
    setLieuId("");
    setLignes([]);
    setStocksTheoriques({});
    setCurrentArticle(null);
    setCurrentQuantite("");
    setCurrentCommentaire("");
    setCurrentPropositions({});
    setShowChangementEtat(false);
    setUnitesExistantes([]);
    setActiveStep(0);
  }, [isOpen]);

  const resetCurrentArticle = () => {
    setCurrentArticle(null);
    setCurrentQuantite("");
    setCurrentCommentaire("");
    setCurrentPropositions({});
    setShowChangementEtat(false);
    setUnitesExistantes([]);
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

    const quantiteTheorique = getStockTheorique(currentArticle.code_article);
    const quantitePhysique = Number(currentQuantite) || 0;
    const ecart = quantitePhysique - quantiteTheorique;

    // Les propositions concernent uniquement les articles suivis par numéro de série.
    if (currentArticle.is_immobilisation && currentArticle.mode_suivi === "NUMERO_SERIE") {
      const hasPropositions = Object.keys(currentPropositions).length > 0;
      if ((ecart !== 0 || showChangementEtat) && !hasPropositions) {
        notify.error("Veuillez renseigner les propositions (ajouts, retraits ou changements d'état).");
        return;
      }
    } else {
      // Fourniture classique
      if (!currentQuantite || Number(currentQuantite) < 0) {
        notify.error("Veuillez saisir une quantité physique valide (≥ 0).");
        return;
      }
    }

    if (lignes.some((l) => l.article === currentArticle.code_article)) {
      notify.error("Cet article est déjà dans la liste.");
      return;
    }

    setLignes([
      ...lignes,
      {
        article: currentArticle.code_article,
        article_designation: currentArticle.designation,
        mode_suivi: currentArticle.mode_suivi,
        is_immobilisation: currentArticle.is_immobilisation,
        quantite_theorique: quantiteTheorique,
        quantite_physique: quantitePhysique,
        ecart: ecart,
        commentaire: currentCommentaire.trim(),
        propositions_series:
          currentArticle.is_immobilisation && currentArticle.mode_suivi === "NUMERO_SERIE"
            ? currentPropositions
            : undefined,
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
        lignes: lignes.map((l) => {
          const lignePayload = {
            article: l.article,
            quantite_physique: l.quantite_physique,
            commentaire: l.commentaire || null,
          };
          // 🆕 Inclure les propositions pour les immobilisations
          if (l.mode_suivi === "NUMERO_SERIE" && l.propositions_series) {
            lignePayload.propositions_series = l.propositions_series;
          }
          return lignePayload;
        }),
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
                  <MenuItem
                    key={lieuType === "magasin" ? l.magasin_id : l.dir_id}
                    value={lieuType === "magasin" ? l.magasin_id : l.dir_id}
                  >
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
        const isNumeroSerie = currentArticle?.mode_suivi === "NUMERO_SERIE";
        const isImmo = currentArticle?.is_immobilisation;
        const nbPropositions =
          (currentPropositions.ajouts || []).length +
          (currentPropositions.retraits || []).length +
          (currentPropositions.changements_etat || []).length;

        return (
          <Box>
            <Typography variant="h3" sx={{ mb: 2 }}>Articles à inventorier</Typography>
            <FormSection>
              <Autocomplete
                options={articles.filter((a) => !lignes.some((l) => l.article === a.code_article))}
                getOptionLabel={(option) => `${option.code_article} - ${option.designation}`}
                isOptionEqualToValue={(option, value) => option?.code_article === value?.code_article}
                value={currentArticle}
                onChange={(_, newValue) => {
                  setCurrentArticle(newValue);
                  setCurrentPropositions({});
                  setShowChangementEtat(false);
                  setUnitesExistantes([]);
                }}
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
                          {option.mode_suivi === "NUMERO_SERIE" && " • N° Série"}
                          {option.categorie_nom ? ` • ${option.categorie_nom}` : ""}
                        </Typography>
                      </Box>
                    </li>
                  );
                }}
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
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{currentArticle.designation}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {currentArticle.code_article}
                      {isNumeroSerie && (
                        <Chip label="N° Série" size="small" color="info" variant="outlined" sx={{ ml: 1, height: 18, fontSize: 10 }} />
                      )}
                      {isImmo && currentArticle.mode_suivi !== "NUMERO_SERIE" && (
                        <Chip label="Immo" size="small" color="primary" variant="outlined" sx={{ ml: 1, height: 18, fontSize: 10 }} />
                      )}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="caption" color="text.secondary">Stock théorique</Typography>
                    <Typography variant="body1" fontWeight={700} fontFamily="monospace" color="primary.main">
                      {getStockTheorique(currentArticle.code_article)}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* 🆕 Affichage conditionnel selon le type d'article */}
              {isImmo ? (
                <Box>
                  {loadingUnites ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2, bgcolor: "#FAFAFA", borderRadius: 1, mt: 2 }}>
                      <CircularProgress size={16} />
                      <Typography variant="body2" color="text.secondary">Chargement des unités en stock...</Typography>
                    </Box>
                  ) : (
                    <>
                      {/* Calcul de l'écart en temps réel pour l'affichage conditionnel */}
                      {(() => {
                        const qteTheo = getStockTheorique(currentArticle.code_article);
                        const qtePhys = Number(currentQuantite) || 0;
                        const ecart = qtePhys - qteTheo;

                        return (
                          <>
                            {/* Champ quantité physique (nécessaire pour calculer l'écart) */}
                            <TextField
                              label="Quantité physique comptée"
                              type="number"
                              value={currentQuantite}
                              onChange={(e) => setCurrentQuantite(e.target.value)}
                              inputProps={{ min: 0, step: 1 }}
                              placeholder="0"
                              fullWidth
                              sx={{ mt: 2 }}
                            />

                            {/* Affichage conditionnel des Ajouts ou Retraits selon l'écart */}
                            {ecart !== 0 && currentQuantite !== "" && (
                              <PropositionsSeriesEditor
                                type="ECART"
                                ecart={ecart}
                                modeSuivi={currentArticle.mode_suivi}
                                unitesExistantes={unitesExistantes}
                                value={currentPropositions}
                                onChange={setCurrentPropositions}
                              />
                            )}

                            {/* 🆕 Toggle pour le changement d'état (indépendant de l'écart) */}
                            <Box sx={{ mt: 2, p: 1.5, bgcolor: "#FFF8E1", borderRadius: 1, border: "1px solid #F9A825" }}>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={showChangementEtat}
                                    onChange={(e) => {
                                      setShowChangementEtat(e.target.checked);
                                      if (!e.target.checked) {
                                        const nextPropositions = { ...currentPropositions };
                                        delete nextPropositions.changements_etat;
                                        setCurrentPropositions(nextPropositions);
                                      }
                                    }}
                                  />
                                }
                                label={
                                  <Typography variant="body2" fontWeight={600}>
                                    <SwapHorizIcon fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
                                    Signaler un changement d'état sur des unités existantes
                                  </Typography>
                                }
                              />

                              {showChangementEtat && (
                                <Box sx={{ mt: 1 }}>
                                  <PropositionsSeriesEditor
                                    type="CHANGEMENT_ETAT"
                                    modeSuivi={currentArticle.mode_suivi}
                                    unitesExistantes={unitesExistantes}
                                    value={currentPropositions}
                                    onChange={setCurrentPropositions}
                                  />
                                </Box>
                              )}
                            </Box>
                          </>
                        );
                      })()}
                    </>
                  )}
                </Box>
              ) : (
                // Fourniture classique (non-immobilisation)
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
              )}

              {currentArticle && !isImmo && currentQuantite !== "" && (
                <Box
                  sx={{
                    mt: 2,
                    p: 1.5,
                    bgcolor: "#FAFAFA",
                    borderRadius: 1,
                    border: "1px solid #E0E0E0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
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
                      sx={{
                        color: getEcartColor(
                          Number(currentQuantite || 0) - getStockTheorique(currentArticle.code_article)
                        ),
                      }}
                    >
                      Écart :{" "}
                      {formatEcart(
                        Number(currentQuantite || 0) - getStockTheorique(currentArticle.code_article)
                      )}
                    </Typography>
                  </Box>
                </Box>
              )}

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={ajouterLigne}
                disabled={
                  !currentArticle ||
                  currentQuantite === "" ||
                  Number(currentQuantite) < 0 ||
                  (isImmo && isNumeroSerie &&
                    ((Number(currentQuantite) - getStockTheorique(currentArticle.code_article) !== 0 || showChangementEtat) &&
                      nbPropositions === 0))
                }
                sx={{ mt: 2 }}
              >
                Ajouter à la liste
              </Button>
            </FormSection>

            {lignes.length > 0 && (
              <StyledTable
                columns={[
                  { label: "Article" },
                  { label: "Mode", align: "center", width: 100 },
                  { label: "Qté théo", align: "center", width: 100 },
                  { label: "Qté physique", align: "center", width: 110 },
                  { label: "Écart", align: "center", width: 90 },
                  { label: "Propositions", width: 160 },
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
                      {ligne.mode_suivi === "NUMERO_SERIE" ? (
                        <Chip label="N° Série" size="small" color="info" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                      ) : (
                        <Chip label="Quantité" size="small" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                      )}
                    </td>
                    <td align="center">
                      <Typography variant="body2" fontFamily="monospace">{ligne.quantite_theorique}</Typography>
                    </td>
                    <td align="center">
                      <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                        {ligne.is_immobilisation && ligne.mode_suivi === "NUMERO_SERIE" ? "—" : ligne.quantite_physique}
                      </Typography>
                    </td>
                    <td align="center">
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        fontFamily="monospace"
                        sx={{ color: getEcartColor(ligne.ecart) }}
                      >
                        {ligne.is_immobilisation && ligne.mode_suivi === "NUMERO_SERIE" ? "—" : formatEcart(ligne.ecart)}
                      </Typography>
                    </td>
                    <td>
                      {ligne.is_immobilisation && ligne.propositions_series ? (
                        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                          {(ligne.propositions_series.ajouts || []).length > 0 && (
                            <Chip
                              label={`+${(ligne.propositions_series.ajouts || []).length}`}
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ height: 20, fontSize: 10 }}
                            />
                          )}
                          {(ligne.propositions_series.retraits || []).length > 0 && (
                            <Chip
                              label={`-${(ligne.propositions_series.retraits || []).length}`}
                              size="small"
                              color="error"
                              variant="outlined"
                              sx={{ height: 20, fontSize: 10 }}
                            />
                          )}
                          {(ligne.propositions_series.changements_etat || []).length > 0 && (
                            <Chip
                              label={`~${(ligne.propositions_series.changements_etat || []).length}`}
                              size="small"
                              color="warning"
                              variant="outlined"
                              sx={{ height: 20, fontSize: 10 }}
                            />
                          )}
                        </Box>
                      ) : (
                        <Chip label="—" size="small" variant="outlined" />
                      )}
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
                  { label: "Mode", align: "center", width: 100 },
                  { label: "Qté théo", align: "center", width: 100 },
                  { label: "Qté physique", align: "center", width: 110 },
                  { label: "Écart", align: "center", width: 90 },
                  { label: "Propositions", width: 160 },
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
                      {ligne.mode_suivi === "NUMERO_SERIE" ? (
                        <Chip label="N° Série" size="small" color="info" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                      ) : (
                        <Chip label="Quantité" size="small" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                      )}
                    </td>
                    <td align="center">
                      <Typography variant="body2" fontFamily="monospace">{ligne.quantite_theorique}</Typography>
                    </td>
                    <td align="center">
                      <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                        {ligne.is_immobilisation && ligne.mode_suivi === "NUMERO_SERIE" ? "—" : ligne.quantite_physique}
                      </Typography>
                    </td>
                    <td align="center">
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        fontFamily="monospace"
                        sx={{ color: getEcartColor(ligne.ecart) }}
                      >
                        {ligne.is_immobilisation && ligne.mode_suivi === "NUMERO_SERIE" ? "—" : formatEcart(ligne.ecart)}
                      </Typography>
                    </td>
                    <td>
                      {ligne.is_immobilisation && ligne.propositions_series ? (
                        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                          {(ligne.propositions_series.ajouts || []).length > 0 && (
                            <Chip
                              label={`+${(ligne.propositions_series.ajouts || []).length}`}
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ height: 20, fontSize: 10 }}
                            />
                          )}
                          {(ligne.propositions_series.retraits || []).length > 0 && (
                            <Chip
                              label={`-${(ligne.propositions_series.retraits || []).length}`}
                              size="small"
                              color="error"
                              variant="outlined"
                              sx={{ height: 20, fontSize: 10 }}
                            />
                          )}
                          {(ligne.propositions_series.changements_etat || []).length > 0 && (
                            <Chip
                              label={`~${(ligne.propositions_series.changements_etat || []).length}`}
                              size="small"
                              color="warning"
                              variant="outlined"
                              sx={{ height: 20, fontSize: 10 }}
                            />
                          )}
                        </Box>
                      ) : (
                        <Chip label="—" size="small" variant="outlined" />
                      )}
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