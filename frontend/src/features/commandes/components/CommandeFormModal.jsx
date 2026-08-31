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
} from "@mui/material";
import {
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon,
  Numbers as NumbersIcon,
  Person as PersonIcon,
  ListAlt as ListAltIcon,
} from "@mui/icons-material";
import { apiClient } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";

// ====== CONSTANTES ======
const STEPS = [
  { label: "Article", icon: <InventoryIcon /> },
  { label: "Quantité", icon: <NumbersIcon /> },
  { label: "Bénéficiaire", icon: <PersonIcon /> },
  { label: "Récapitulatif", icon: <ListAltIcon /> },
];

const OBJETS_DEMANDE = [
  "Utilisation simple",
  "Nouveau membre",
  "Remplacement de matériel",
  "Autre",
];

const EMPLOYEES_ENDPOINT = "/api/employee/employee/";

export function CommandeFormModal({ isOpen, onClose, onSuccess, commandeToEdit = null }) {
  // ✅ On récupère `user` pour identifier le demandeur
  const { hasAction, user } = useAuth();

  // TODO: Implémenter les permissions réelles avec hasAction
  // Exemple: const canCreate = hasAction('COM_DEM');
  const canEdit = true;

  // ====== STATE WIZARD ======
  const [activeStep, setActiveStep] = useState(0);

  // ====== DONNÉES DE RÉFÉRENCE ======
  const [articles, setArticles] = useState([]);
  const [employees, setEmployees] = useState([]);

  // ====== DONNÉES DU FORMULAIRE ======
  const [objet, setObjet] = useState("");
  const [lignes, setLignes] = useState([]);

  // Données de l'étape en cours
  const [currentArticle, setCurrentArticle] = useState(null);
  const [currentQuantite, setCurrentQuantite] = useState("");
  const [currentBeneficiaire, setCurrentBeneficiaire] = useState(null);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isEditMode = Boolean(commandeToEdit);

  // ====== ✅ DÉTECTION DE L'EMPLOYÉ LIÉ À L'UTILISATEUR CONNECTÉ ======
  const employeeDemandeur = employees.find(
    (e) => String(e.emp_utilisateur_id) === String(user?.utilisateur_id)
  );

  // ====== CHARGEMENT DES DONNÉES ======
  useEffect(() => {
    if (!isOpen) return;

    Promise.all([
      apiClient.get("/api/catalogue/articles/", { params: { page_size: 500 } }),
      apiClient.get(EMPLOYEES_ENDPOINT, { params: { page_size: 500 } }),
    ])
      .then(([articlesRes, employeesRes]) => {
        setArticles(articlesRes.data.results ?? articlesRes.data);
        setEmployees(employeesRes.data.results ?? employeesRes.data);
      })
      .catch(() => setError("Impossible de charger les données."));
  }, [isOpen]);

  // ====== MODE ÉDITION : charger la commande existante ======
  useEffect(() => {
    if (!isOpen) return;

    if (commandeToEdit) {
      setObjet(commandeToEdit.objet || "");
      const lignesTransformees = (commandeToEdit.details || []).map((detail) => {
        const attribution = detail.attributions?.[0];
        const article = articles.find((a) => a.code_article === detail.article);
        const beneficiaire = attribution?.employe_beneficiaire
          ? employees.find((e) => e.emp_id === attribution.employe_beneficiaire)
          : null;
        return {
          article: detail.article,
          article_designation: detail.article_designation,
          stock_calcule: article?.stock_calcule ?? 0,
          quantite: Number(detail.quantite),
          employe_beneficiaire: attribution?.employe_beneficiaire || null,
          beneficiaire_nom: beneficiaire?.emp_nom || null,
        };
      });
      setLignes(lignesTransformees);
    } else {
      setObjet("");
      setLignes([]);
    }
    resetCurrentStep();
    setActiveStep(0);
    setError("");
  }, [isOpen, commandeToEdit, articles, employees]);

  // ====== ✅ PRÉ-REMPLISSAGE DU BÉNÉFICIAIRE PAR DÉFAUT ======
  // Quand on arrive à l'étape 2 (bénéficiaire) pour la première fois,
  // on pré-remplit avec l'employé lié à l'utilisateur connecté (le demandeur).
  useEffect(() => {
    if (!isOpen) return;
    if (activeStep !== 2) return;
    if (employees.length === 0) return;
    // Ne pas écraser un choix manuel déjà fait par l'utilisateur
    if (currentBeneficiaire) return;

    if (employeeDemandeur) {
      setCurrentBeneficiaire(employeeDemandeur);
    }
  }, [isOpen, activeStep, employees, currentBeneficiaire, employeeDemandeur]);

  // ====== HELPERS ======
  const resetCurrentStep = () => {
    setCurrentArticle(null);
    setCurrentQuantite("");
    setCurrentBeneficiaire(null);
  };

  const handleClose = () => {
    resetCurrentStep();
    setObjet("");
    setLignes([]);
    setError("");
    setActiveStep(0);
    onClose();
  };

  // ====== NAVIGATION ======
  const handleNext = () => {
    setError("");

    if (activeStep === 0 && !currentArticle) {
      setError("Veuillez sélectionner un article.");
      return;
    }
    if (activeStep === 1) {
      if (!currentQuantite || Number(currentQuantite) <= 0) {
        setError("Veuillez saisir une quantité valide.");
        return;
      }
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

  const handleAjouterEtContinuer = () => {
    if (!currentArticle || !currentQuantite || Number(currentQuantite) <= 0) {
      setError("Données invalides.");
      return;
    }

    const nouvelleLigne = {
      article: currentArticle.code_article,
      article_designation: currentArticle.designation,
      stock_calcule: currentArticle.stock_calcule ?? 0,
      quantite: Number(currentQuantite),
      employe_beneficiaire: currentBeneficiaire?.emp_id || null,
      beneficiaire_nom: currentBeneficiaire?.emp_nom || null,
    };

    setLignes([...lignes, nouvelleLigne]);
    resetCurrentStep();
    setActiveStep(0);
  };

  const handleVoirRecap = () => {
    if (!currentArticle || !currentQuantite || Number(currentQuantite) <= 0) {
      setError("Données invalides. Veuillez compléter les étapes précédentes.");
      return;
    }

    const nouvelleLigne = {
      article: currentArticle.code_article,
      article_designation: currentArticle.designation,
      stock_calcule: currentArticle.stock_calcule ?? 0,
      quantite: Number(currentQuantite),
      employe_beneficiaire: currentBeneficiaire?.emp_id || null,
      beneficiaire_nom: currentBeneficiaire?.emp_nom || null,
    };

    setLignes([...lignes, nouvelleLigne]);
    resetCurrentStep();
    setActiveStep(3);
  };

  const handleAjouterAutreDepuisRecap = () => {
    resetCurrentStep();
    setActiveStep(0);
  };

  const handleRetirerLigne = (index) => {
    setLignes(lignes.filter((_, i) => i !== index));
  };

  // ====== ✅ DÉTECTION SI BÉNÉFICIAIRE = DEMANDEUR ======
  const isBeneficiaireDemandeur = (beneficiaire) => {
    if (!beneficiaire?.emp_utilisateur_id || !user?.utilisateur_id) return false;
    return String(beneficiaire.emp_utilisateur_id) === String(user.utilisateur_id);
  };

  // ====== ENREGISTREMENT ======
  const handleSubmit = async () => {
    if (lignes.length === 0) {
      setError("Ajoutez au moins un article à la commande.");
      return;
    }
    if (!objet.trim()) {
      setError("Veuillez saisir l'objet de la demande.");
      return;
    }

    // ✅ Vérification : l'utilisateur connecté doit être lié à un employé
    if (!employeeDemandeur) {
      setError(
        "Votre compte utilisateur n'est pas lié à un employé. " +
        "Veuillez contacter l'administrateur."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const detailsPayload = lignes.map((ligne) => {
        const detail = {
          article: ligne.article,
          quantite: ligne.quantite,
        };
        if (ligne.employe_beneficiaire) {
          detail.attributions = [
            {
              employe_beneficiaire: ligne.employe_beneficiaire,
              quantite: ligne.quantite,
            },
          ];
        }
        return detail;
      });

      // ✅ Payload avec employe_demandeur (emp_id de l'utilisateur connecté)
      const payload = {
        objet: objet.trim(),
        employe_demandeur: employeeDemandeur.emp_id, // ✅ Champ requis par le backend
        details: detailsPayload,
      };

      if (isEditMode) {
        await apiClient.put(`/api/commandes/commandes/${commandeToEdit.commande_id}/`, payload);
      } else {
        await apiClient.post("/api/commandes/commandes/", payload);
      }

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
        setError("Erreur lors de l'enregistrement de la commande.");
      }
    } finally {
      setSaving(false);
    }
  };

  // ====== RENDU DES ÉTAPES ======
  const renderStepContent = () => {
    switch (activeStep) {
      // ====== ÉTAPE 1 : SÉLECTION ARTICLE ======
      case 0:
        return (
          <Box>
            <Typography variant="h3" sx={{ mb: 2 }}>
              Choisissez un article
            </Typography>
            <Autocomplete
              options={articles}
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
                      Stock disponible : {option.stock_calcule ?? 0}
                      {option.categorie_nom ? ` • ${option.categorie_nom}` : ""}
                    </Typography>
                  </Box>
                </li>
              )}
              noOptionsText="Aucun article trouvé"
            />

            {currentArticle && (
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
                  {currentArticle.designation}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Code : {currentArticle.code_article} • Stock :{" "}
                  {currentArticle.stock_calcule ?? 0}
                </Typography>
              </Box>
            )}
          </Box>
        );

      // ====== ÉTAPE 2 : QUANTITÉ ======
      case 1:
        return (
          <Box>
            <Typography variant="h3" sx={{ mb: 2 }}>
              Quantité demandée
            </Typography>

            {currentArticle && (
              <Box
                sx={{
                  mb: 2,
                  p: 1.5,
                  bgcolor: "#FAFAFA",
                  borderRadius: 1,
                  border: "1px solid #E0E0E0",
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {currentArticle.designation}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {currentArticle.code_article}
                </Typography>
              </Box>
            )}

            <TextField
              label="Quantité"
              type="number"
              value={currentQuantite}
              onChange={(e) => setCurrentQuantite(e.target.value)}
              fullWidth
              autoFocus
              inputProps={{ min: 1, step: 1 }}
              placeholder="Ex: 5"
              helperText={
                currentArticle?.stock_calcule !== undefined
                  ? `Stock disponible : ${currentArticle.stock_calcule}`
                  : ""
              }
            />

            {currentArticle &&
              currentQuantite &&
              Number(currentQuantite) > currentArticle.stock_calcule && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  La quantité demandée dépasse le stock disponible. Une commande sera
                  nécessaire pour {Number(currentQuantite) - currentArticle.stock_calcule}{" "}
                  unité(s).
                </Alert>
              )}
          </Box>
        );

      // ====== ÉTAPE 3 : BÉNÉFICIAIRE (avec pré-remplissage) ======
      case 2: {
        const isDemandeur = isBeneficiaireDemandeur(currentBeneficiaire);

        return (
          <Box>
            <Typography variant="h3" sx={{ mb: 2 }}>
              Bénéficiaire
            </Typography>

            <Autocomplete
              options={employees}
              getOptionLabel={(option) =>
                option?.emp_nom
                  ? `${option.emp_nom} (${option.emp_matricule})`
                  : ""
              }
              isOptionEqualToValue={(option, value) =>
                option?.emp_id === value?.emp_id
              }
              value={currentBeneficiaire}
              onChange={(_, newValue) => setCurrentBeneficiaire(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Bénéficiaire"
                  placeholder="Rechercher un employé..."
                  autoFocus
                />
              )}
              renderOption={(props, option) => {
                const isSelf = String(option.emp_utilisateur_id) === String(user?.utilisateur_id);
                return (
                  <li {...props} key={option.emp_id}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="body2" fontWeight={500}>
                          {option.emp_nom}
                        </Typography>
                        {isSelf && (
                          <Chip
                            label="Vous"
                            size="small"
                            color="primary"
                            sx={{ height: 20, fontSize: 11, fontWeight: 600 }}
                          />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {option.emp_matricule}
                        {option.emp_fonction ? ` • ${option.emp_fonction}` : ""}
                        {option.emp_contact ? ` • ${option.emp_contact}` : ""}
                      </Typography>
                    </Box>
                  </li>
                );
              }}
              noOptionsText="Aucun employé trouvé"
            />

            {/* ✅ Messages d'aide dynamiques */}
            {currentBeneficiaire && isDemandeur && (
              <Alert severity="info" sx={{ mt: 2 }}>
                💡 Le bénéficiaire est pré-rempli avec <strong>votre nom</strong> (le demandeur).
                Vous pouvez le changer si l'article est destiné à un autre employé.
              </Alert>
            )}

            {currentBeneficiaire && !isDemandeur && (
              <Alert severity="info" sx={{ mt: 2 }}>
                💡 L'article sera attribué à <strong>{currentBeneficiaire.emp_nom}</strong>.
              </Alert>
            )}

            {!currentBeneficiaire && (
              <Alert severity="info" sx={{ mt: 2 }}>
                💡 Si aucun bénéficiaire n'est spécifié, l'article sera automatiquement
                attribué au demandeur.
              </Alert>
            )}
          </Box>
        );
      }

      // ====== ÉTAPE 4 : RÉCAPITULATIF ======
      case 3:
        return (
          <Box>
            <Typography variant="h3" sx={{ mb: 2 }}>
              Récapitulatif de la commande
            </Typography>

            {/* ✅ Affichage du demandeur */}
            {employeeDemandeur && (
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
                <PersonIcon fontSize="small" color="primary" />
                <Typography variant="body2">
                  <strong>Demandeur :</strong> {employeeDemandeur.emp_nom}
                  {employeeDemandeur.emp_matricule && ` (${employeeDemandeur.emp_matricule})`}
                </Typography>
              </Box>
            )}

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Objet de la demande</InputLabel>
              <Select
                value={objet}
                label="Objet de la demande"
                onChange={(e) => setObjet(e.target.value)}
              >
                {OBJETS_DEMANDE.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
              Articles commandés ({lignes.length})
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
                    <TableCell align="center" sx={{ width: 100 }}>
                      Quantité
                    </TableCell>
                    <TableCell sx={{ width: 200 }}>Bénéficiaire</TableCell>
                    <TableCell align="center" sx={{ width: 60 }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lignes.map((ligne, index) => (
                    <TableRow
                      key={index}
                      sx={{ "&:hover": { bgcolor: "#FFFDE7" } }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {ligne.article}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ligne.article_designation}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          fontFamily="monospace"
                        >
                          {ligne.quantite}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {ligne.beneficiaire_nom ? (
                          <Chip
                            label={ligne.beneficiaire_nom}
                            size="small"
                            color="primary"
                            variant="outlined"
                            icon={<PersonIcon />}
                          />
                        ) : (
                          <Chip
                            label="Demandeur (auto)"
                            size="small"
                            variant="outlined"
                            color="default"
                            sx={{ fontStyle: "italic", opacity: 0.7 }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRetirerLigne(index)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
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
    if (activeStep === 0 || activeStep === 1) {
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
    }

    if (activeStep === 2) {
      return (
        <>
          <Button onClick={handleBack} startIcon={<ArrowBackIcon />}>
            Précédent
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="outlined"
            onClick={handleAjouterEtContinuer}
            startIcon={<AddIcon />}
          >
            Ajouter un autre article
          </Button>
          <Button
            variant="contained"
            onClick={handleVoirRecap}
            endIcon={<ArrowForwardIcon />}
          >
            Voir le récapitulatif
          </Button>
        </>
      );
    }

    if (activeStep === STEPS.length - 1) {
      return (
        <>
          <Button onClick={handleBack} startIcon={<ArrowBackIcon />}>
            Précédent
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="outlined"
            onClick={handleAjouterAutreDepuisRecap}
            startIcon={<AddIcon />}
          >
            Ajouter un autre article
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving || lignes.length === 0 || !objet}
            startIcon={
              saving ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
          >
            {saving ? "Enregistrement..." : "Enregistrer la commande"}
          </Button>
        </>
      );
    }

    return null;
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2, minHeight: 500 } }}
    >
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
              bgcolor: isEditMode ? "primary.main" : "success.main",
              color: "white",
              borderRadius: 1,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {isEditMode ? "ÉDITION" : "CRÉATION"}
          </Box>
          <Typography variant="h3">
            {isEditMode ? "Modifier la commande" : "Nouvelle commande"}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

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

      <DialogContent sx={{ pt: 3, minHeight: 300 }}>
        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* ✅ Alerte si l'utilisateur n'est pas lié à un employé */}
        {!employeeDemandeur && employees.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            ⚠️ Votre compte utilisateur n'est pas lié à un employé.
            Vous ne pourrez pas créer de commande tant que ce n'est pas fait.
            Veuillez contacter l'administrateur.
          </Alert>
        )}

        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>{renderActions()}</DialogActions>
    </Dialog>
  );
}