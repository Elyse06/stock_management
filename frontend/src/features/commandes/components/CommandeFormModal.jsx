// src/features/commandes/components/CommandeFormModal.jsx
import { useEffect, useState } from "react";
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Box,
  Alert,
  Chip,
  Autocomplete,
  IconButton,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Inventory as InventoryIcon,
  Numbers as NumbersIcon,
  ListAlt as ListAltIcon,
} from "@mui/icons-material";
import { apiClient } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";

// Composants wizard réutilisables
import { WizardDialog } from "../../../components/wizard/WizardDialog";
import { WizardActions } from "../../../components/wizard/WizardActions";
import { StyledTable } from "../../../components/wizard/StyledTable";
import { InfoBox } from "../../../components/wizard/InfoBox";
import { FormSection } from "../../../components/wizard/FormSection";

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

  // ====== DÉTECTION DE L'EMPLOYÉ LIÉ À L'UTILISATEUR CONNECTÉ ======
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

  // ====== PRÉ-REMPLISSAGE DU BÉNÉFICIAIRE PAR DÉFAUT ======
  useEffect(() => {
    if (!isOpen) return;
    if (activeStep !== 2) return;
    if (employees.length === 0) return;
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

  // ====== DÉTECTION SI BÉNÉFICIAIRE = DEMANDEUR ======
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

      const payload = {
        objet: objet.trim(),
        employe_demandeur: employeeDemandeur.emp_id,
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
              <InfoBox
                title={currentArticle.designation}
                subtitle={`Code : ${currentArticle.code_article} • Stock : ${currentArticle.stock_calcule ?? 0}`}
              />
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
              <FormSection>
                <Typography variant="body2" fontWeight={600}>
                  {currentArticle.designation}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {currentArticle.code_article}
                </Typography>
              </FormSection>
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

      // ====== ÉTAPE 3 : BÉNÉFICIAIRE ======
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

            {employeeDemandeur && (
              <InfoBox
                icon={<PersonIcon fontSize="small" color="primary" />}
                title={`Demandeur : ${employeeDemandeur.emp_nom}${employeeDemandeur.emp_matricule ? ` (${employeeDemandeur.emp_matricule})` : ""}`}
              />
            )}

            <FormControl fullWidth sx={{ mb: 2, mt: 2 }}>
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
              <StyledTable
                columns={[
                  { label: "Article" },
                  { label: "Quantité", align: "center", width: 100 },
                  { label: "Bénéficiaire", width: 200 },
                  { label: "", align: "center", width: 60 },
                ]}
              >
                {lignes.map((ligne, index) => (
                  <tr key={index} style={{ "&:hover": { bgcolor: "#FFFDE7" } }}>
                    <td>
                      <Typography variant="body2" fontWeight={600}>
                        {ligne.article}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {ligne.article_designation}
                      </Typography>
                    </td>
                    <td align="center">
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        fontFamily="monospace"
                      >
                        {ligne.quantite}
                      </Typography>
                    </td>
                    <td>
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
                    </td>
                    <td align="center">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRetirerLigne(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
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

  // ====== BOUTONS D'ACTION ======
  const renderActions = () => {
    // Étape 0, 1 : Précédent + Suivant
    if (activeStep === 0 || activeStep === 1) {
      return (
        <WizardActions
          activeStep={activeStep}
          totalSteps={STEPS.length}
          onBack={handleBack}
          onNext={handleNext}
          isLastStep={false}
        />
      );
    }

    // Étape 2 : Ajouter un autre OU Voir le récap
    if (activeStep === 2) {
      return (
        <>
          <IconButton onClick={handleBack} size="small">
            Précédent
          </IconButton>
          <Box sx={{ flex: 1 }} />
          <IconButton
            variant="outlined"
            onClick={handleAjouterEtContinuer}
            startIcon={<AddIcon />}
          >
            Ajouter un autre article
          </IconButton>
          <IconButton
            variant="contained"
            onClick={handleVoirRecap}
          >
            Voir le récapitulatif
          </IconButton>
        </>
      );
    }

    // Étape 3 : Ajouter un autre OU Enregistrer
    if (activeStep === STEPS.length - 1) {
      return (
        <>
          <IconButton onClick={handleBack} size="small">
            Précédent
          </IconButton>
          <Box sx={{ flex: 1 }} />
          <IconButton
            variant="outlined"
            onClick={handleAjouterAutreDepuisRecap}
            startIcon={<AddIcon />}
          >
            Ajouter un autre article
          </IconButton>
          <WizardActions
            activeStep={activeStep}
            totalSteps={STEPS.length}
            onBack={handleBack}
            onSubmit={handleSubmit}
            isLastStep={true}
            loading={saving}
            submitLabel="Enregistrer la commande"
            disabled={lignes.length === 0 || !objet}
          />
        </>
      );
    }

    return null;
  };

  return (
    <WizardDialog
      isOpen={isOpen}
      onClose={handleClose}
      steps={STEPS}
      activeStep={activeStep}
      title={isEditMode ? "Modifier la commande" : "Nouvelle commande"}
      mode={isEditMode ? "ÉDITION" : "CRÉATION"}
      error={error}
      onErrorClose={() => setError("")}
      actions={renderActions()}
    >
      {/* Alerte si l'utilisateur n'est pas lié à un employé */}
      {!employeeDemandeur && employees.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          ⚠️ Votre compte utilisateur n'est pas lié à un employé.
          Vous ne pourrez pas créer de commande tant que ce n'est pas fait.
          Veuillez contacter l'administrateur.
        </Alert>
      )}

      {renderStepContent()}
    </WizardDialog>
  );
}