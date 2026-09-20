import { useEffect, useState } from "react";
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Box,
  Button,
  IconButton,
  Autocomplete,
  Tooltip,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  Inventory as InventoryIcon,
  Numbers as NumbersIcon,
  ListAlt as ListAltIcon,
  Business as BusinessIcon,
} from "@mui/icons-material";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../../constants/api";
import { usePermission } from "../../../hooks/usePermission";
import { useNotification } from "../../../components/common/NotificationProvider";
import { WizardDialog } from "../../../components/wizard/WizardDialog";
import { WizardActions } from "../../../components/wizard/WizardActions";
import { StyledTable } from "../../../components/wizard/StyledTable";
import { InfoBox } from "../../../components/wizard/InfoBox";
import { FormSection } from "../../../components/wizard/FormSection";
import { AttributionEditor } from "./AttributionEditor";
import { Chip } from "@mui/material";

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

export function CommandeFormModal({ isOpen, onClose, onSuccess, commandeToEdit = null }) {
  const notify = useNotification();
  const { user } = usePermission();

  const [activeStep, setActiveStep] = useState(0);
  const [articles, setArticles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [directions, setDirections] = useState([]);
  const [objet, setObjet] = useState("");
  const [lignes, setLignes] = useState([]);
  const [currentArticle, setCurrentArticle] = useState(null);
  const [currentQuantite, setCurrentQuantite] = useState("");
  const [currentAttributions, setCurrentAttributions] = useState([]);
  const [editingLineIndex, setEditingLineIndex] = useState(null);
  const [saving, setSaving] = useState(false);

  const isEditMode = Boolean(commandeToEdit);

  const employeeDemandeur = employees.find(
    (e) => String(e.emp_utilisateur_id) === String(user?.utilisateur_id)
  );

  const directionDemandeur = directions.find((d) => {
    if (employeeDemandeur?.direction_libelle && d.dir_libelle) {
      return d.dir_libelle.trim().toLowerCase() === employeeDemandeur.direction_libelle.trim().toLowerCase();
    }
    if (employeeDemandeur?.emp_serv_id?.serv_dir_id) {
      return String(d.dir_id) === String(employeeDemandeur.emp_serv_id.serv_dir_id);
    }
    return false;
  }) || (directions.length > 0 ? directions[0] : null);

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      apiClient.get(API_ENDPOINTS.ARTICLES, { params: { page_size: 500 } }),
      apiClient.get(API_ENDPOINTS.EMPLOYEES, { params: { page_size: 500 } }),
      apiClient.get(API_ENDPOINTS.DIRECTIONS, { params: { page_size: 100 } }),
    ])
      .then(([articlesRes, employeesRes, directionsRes]) => {
        setArticles(articlesRes.data.results ?? articlesRes.data);
        setEmployees(employeesRes.data.results ?? employeesRes.data);
        setDirections(directionsRes.data.results ?? directionsRes.data);
      })
      .catch(() => notify.error(ERROR_MESSAGES.LOAD_FAILED));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (commandeToEdit) {
      setObjet(commandeToEdit.objet || "");
      const lignesTransformees = (commandeToEdit.details || []).map((detail) => {
        const article = articles.find((a) => a.code_article === detail.article);
        const attributions = (detail.attributions || []).map((attr) => {
          if (attr.employe_beneficiaire) {
            const employe = employees.find((e) => e.emp_id === attr.employe_beneficiaire);
            return {
              type: "EMPLOYE",
              beneficiaire_id: attr.employe_beneficiaire,
              beneficiaire_nom: employe?.emp_nom || attr.beneficiaire_nom || "Employé",
              beneficiaire: employe || { emp_id: attr.employe_beneficiaire, emp_nom: attr.beneficiaire_nom },
              quantite: Number(attr.quantite),
            };
          } else if (attr.direction_beneficiaire) {
            const direction = directions.find((d) => d.dir_id === attr.direction_beneficiaire);
            return {
              type: "DIRECTION",
              beneficiaire_id: attr.direction_beneficiaire,
              beneficiaire_nom: direction?.dir_libelle || attr.beneficiaire_nom || "Direction",
              beneficiaire: direction || { dir_id: attr.direction_beneficiaire, dir_libelle: attr.beneficiaire_nom },
              quantite: Number(attr.quantite),
            };
          }
          return null;
        }).filter(Boolean);
        return {
          article: detail.article,
          article_designation: detail.article_designation,
          stock_calcule: article?.stock_calcule ?? 0,
          is_immobilisation: article?.is_immobilisation ?? true,
          quantite: Number(detail.quantite),
          attributions,
        };
      });
      setLignes(lignesTransformees);
    } else {
      setObjet("");
      setLignes([]);
    }
    resetCurrentStep();
    setActiveStep(0);
  }, [isOpen, commandeToEdit, articles, employees, directions]);

  const resetCurrentStep = () => {
    setCurrentArticle(null);
    setCurrentQuantite("");
    setCurrentAttributions([]);
    setEditingLineIndex(null);
  };

  const handleClose = () => {
    resetCurrentStep();
    setObjet("");
    setLignes([]);
    setActiveStep(0);
    onClose();
  };

  const handleNext = () => {
    if (activeStep === 0 && !currentArticle) {
      notify.error("Veuillez sélectionner un article.");
      return;
    }
    if (activeStep === 1) {
      if (!currentQuantite || Number(currentQuantite) <= 0) {
        notify.error("Veuillez saisir une quantité valide.");
        return;
      }
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

  const creerLigneFormattee = () => {
    const qteTotale = Number(currentQuantite);
    const isImmob = currentArticle?.is_immobilisation !== false;

    let finalAttributions = currentAttributions.map((a) => {
      const isEmp = a.type === "EMPLOYE";
      return {
        type: a.type,
        beneficiaire_id: isEmp ? a.beneficiaire?.emp_id : a.beneficiaire?.dir_id,
        beneficiaire_nom: isEmp
          ? (a.beneficiaire?.emp_nom || "Employé")
          : (a.beneficiaire?.dir_libelle || "Direction"),
        beneficiaire: a.beneficiaire,
        quantite: Number(a.quantite),
      };
    });

    const sommeAttribuee = finalAttributions.reduce((sum, a) => sum + (Number(a.quantite) || 0), 0);
    const reste = qteTotale - sommeAttribuee;

    // Répartition automatique du solde non attribué
    if (reste > 0) {
      if (isImmob && employeeDemandeur) {
        finalAttributions.push({
          type: "EMPLOYE",
          beneficiaire_id: employeeDemandeur.emp_id,
          beneficiaire_nom: employeeDemandeur.emp_nom,
          beneficiaire: employeeDemandeur,
          quantite: reste,
        });
      } else if (directionDemandeur) {
        finalAttributions.push({
          type: "DIRECTION",
          beneficiaire_id: directionDemandeur.dir_id,
          beneficiaire_nom: directionDemandeur.dir_libelle,
          beneficiaire: directionDemandeur,
          quantite: reste,
        });
      }
    }

    return {
      article: currentArticle.code_article,
      article_designation: currentArticle.designation,
      stock_calcule: currentArticle.stock_calcule ?? 0,
      is_immobilisation: isImmob,
      quantite: qteTotale,
      attributions: finalAttributions,
    };
  };

  const sauvegarderLigneCourante = () => {
    if (!currentArticle || !currentQuantite || Number(currentQuantite) <= 0) {
      notify.error("Données invalides. Veuillez sélectionner un article et une quantité valide.");
      return false;
    }

    const nouvelleLigne = creerLigneFormattee();

    if (editingLineIndex !== null) {
      const updated = [...lignes];
      updated[editingLineIndex] = nouvelleLigne;
      setLignes(updated);
      setEditingLineIndex(null);
    } else {
      setLignes([...lignes, nouvelleLigne]);
    }

    resetCurrentStep();
    return true;
  };

  const handleAjouterEtContinuer = () => {
    if (sauvegarderLigneCourante()) {
      setActiveStep(0);
    }
  };

  const handleVoirRecap = () => {
    if (sauvegarderLigneCourante()) {
      setActiveStep(3);
    }
  };

  const handleAjouterAutreDepuisRecap = () => {
    resetCurrentStep();
    setActiveStep(0);
  };

  const handleModifierLigne = (index) => {
    const ligne = lignes[index];
    const article = articles.find((a) => a.code_article === ligne.article) || {
      code_article: ligne.article,
      designation: ligne.article_designation,
      stock_calcule: ligne.stock_calcule,
      is_immobilisation: ligne.is_immobilisation,
    };

    setCurrentArticle(article);
    setCurrentQuantite(String(ligne.quantite));

    const attributionsReconstituees = (ligne.attributions || []).map((a) => ({
      type: a.type,
      beneficiaire: a.beneficiaire || (a.type === "EMPLOYE"
        ? employees.find((e) => e.emp_id === a.beneficiaire_id) || { emp_id: a.beneficiaire_id, emp_nom: a.beneficiaire_nom }
        : directions.find((d) => d.dir_id === a.beneficiaire_id) || { dir_id: a.beneficiaire_id, dir_libelle: a.beneficiaire_nom }),
      quantite: a.quantite,
    }));

    setCurrentAttributions(attributionsReconstituees);
    setEditingLineIndex(index);
    setActiveStep(1);
  };

  const handleRetirerLigne = (index) => {
    if (editingLineIndex === index) {
      resetCurrentStep();
    }
    setLignes(lignes.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (lignes.length === 0) {
      notify.error("Ajoutez au moins un article à la commande.");
      return;
    }
    if (!objet.trim()) {
      notify.error("Veuillez saisir l'objet de la demande.");
      return;
    }
    if (!employeeDemandeur) {
      notify.error("Votre compte utilisateur n'est pas lié à un employé. Veuillez contacter l'administrateur.");
      return;
    }

    setSaving(true);
    try {
      const detailsPayload = lignes.map((ligne) => {
        const detail = {
          article: ligne.article,
          quantite: ligne.quantite,
        };
        if (ligne.attributions && ligne.attributions.length > 0) {
          detail.attributions = ligne.attributions.map((a) => {
            const item = {
              quantite: a.quantite,
              quantite_demandee: a.quantite,
            };
            if (a.type === "EMPLOYE") {
              item.employe_beneficiaire = a.beneficiaire_id;
            } else {
              item.direction_beneficiaire = a.beneficiaire_id;
            }
            return item;
          });
        }
        return detail;
      });

      const payload = {
        objet: objet.trim(),
        employe_demandeur: employeeDemandeur.emp_id,
        details: detailsPayload,
      };

      if (isEditMode) {
        await apiClient.put(`${API_ENDPOINTS.COMMANDES}${commandeToEdit.commande_id}/`, payload);
        notify.success("Commande modifiée avec succès");
      } else {
        await apiClient.post(API_ENDPOINTS.COMMANDES, payload);
        notify.success("Commande créée avec succès");
      }

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
            <Typography variant="h3" sx={{ mb: 2 }}>Choisissez un article</Typography>
            <Autocomplete
              options={articles}
              getOptionLabel={(option) => `${option.code_article} - ${option.designation}`}
              isOptionEqualToValue={(option, value) => option?.code_article === value?.code_article}
              value={currentArticle}
              onChange={(_, newValue) => setCurrentArticle(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Article" placeholder="Rechercher un article..." autoFocus />
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

      case 1:
        return (
          <Box>
            <Typography variant="h3" sx={{ mb: 2 }}>Quantité demandée</Typography>
            {currentArticle && (
              <FormSection>
                <Typography variant="body2" fontWeight={600}>{currentArticle.designation}</Typography>
                <Typography variant="caption" color="text.secondary">{currentArticle.code_article}</Typography>
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
              helperText={currentArticle?.stock_calcule !== undefined ? `Stock disponible : ${currentArticle.stock_calcule}` : ""}
            />
            {currentArticle && currentQuantite && Number(currentQuantite) > currentArticle.stock_calcule && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: "#FFF8E1", borderRadius: 1, border: "1px solid #F9A825" }}>
                <Typography variant="body2" color="primary.main">
                  La quantité demandée dépasse le stock disponible. Une commande sera nécessaire pour{" "}
                  {Number(currentQuantite) - currentArticle.stock_calcule} unité(s).
                </Typography>
              </Box>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h3" sx={{ mb: 2 }}>Attributions</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Répartition de la quantité entre plusieurs bénéficiaires
            </Typography>
            <AttributionEditor
              quantiteTotale={Number(currentQuantite)}
              attributions={currentAttributions}
              setAttributions={setCurrentAttributions}
              employees={employees}
              directions={directions}
              demandeurParDefaut={employeeDemandeur}
              articleCourant={currentArticle}
            />
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h3" sx={{ mb: 2 }}>Récapitulatif de la commande</Typography>
            {employeeDemandeur && (
              <InfoBox
                icon={<PersonIcon fontSize="small" color="primary" />}
                title={`Demandeur : ${employeeDemandeur.emp_nom}${employeeDemandeur.emp_matricule ? ` (${employeeDemandeur.emp_matricule})` : ""}`}
              />
            )}
            <FormControl fullWidth sx={{ mb: 2, mt: 2 }}>
              <InputLabel>Objet de la demande</InputLabel>
              <Select value={objet} label="Objet de la demande" onChange={(e) => setObjet(e.target.value)}>
                {OBJETS_DEMANDE.map((option) => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
              Articles commandés ({lignes.length})
            </Typography>
            {lignes.length === 0 ? (
              <Box sx={{ p: 2, bgcolor: "#FFF8E1", borderRadius: 1 }}>
                <Typography variant="body2" color="primary.main">
                  Aucun article ajouté. Veuillez revenir en arrière pour en ajouter.
                </Typography>
              </Box>
            ) : (
              <StyledTable
                columns={[
                  { label: "Article" },
                  { label: "Quantité", align: "center", width: 100 },
                  { label: "Bénéficiaire", width: 220 },
                  { label: "Actions", align: "center", width: 90 },
                ]}
              >
                {lignes.map((ligne, index) => (
                  <tr key={index}>
                    <td>
                      <Typography variant="body2" fontWeight={600}>{ligne.article}</Typography>
                      <Typography variant="caption" color="text.secondary">{ligne.article_designation}</Typography>
                    </td>
                    <td align="center">
                      <Typography variant="body2" fontWeight={600} fontFamily="monospace">{ligne.quantite}</Typography>
                    </td>
                    <td>
                      {ligne.attributions && ligne.attributions.length > 0 ? (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                          {ligne.attributions.map((attr, idx) => {
                            const isEmploye = attr.type === "EMPLOYE";
                            const employeComplet = isEmploye
                              ? employees.find((e) => e.emp_id === attr.beneficiaire_id) || attr.beneficiaire
                              : null;
                            const directionLibelle = isEmploye
                              ? employeComplet?.direction_libelle
                              : (attr.beneficiaire_nom || attr.beneficiaire?.dir_libelle);
                            const siteNom = isEmploye ? employeComplet?.site_nom : attr.beneficiaire?.site_nom;

                            return (
                              <Box key={idx} sx={{ mb: 0.5 }}>
                                <Chip
                                  label={`${attr.beneficiaire_nom || (isEmploye ? "Employé" : "Direction")} (${attr.quantite})`}
                                  size="small"
                                  color={isEmploye ? "primary" : "secondary"}
                                  variant="outlined"
                                  icon={isEmploye ? <PersonIcon /> : <BusinessIcon />}
                                />
                                {(directionLibelle || siteNom) && (
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.3, ml: 1 }}>
                                    <BusinessIcon sx={{ fontSize: 12 }} color="action" />
                                    <Typography variant="caption" color="text.secondary">
                                      {siteNom ? `${siteNom} → ` : ""}
                                      {directionLibelle || "—"}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            );
                          })}
                        </Box>
                      ) : (
                        <Chip
                          label={employeeDemandeur ? `${employeeDemandeur.emp_nom} (${ligne.quantite})` : "Demandeur"}
                          size="small"
                          variant="outlined"
                          color="default"
                          sx={{ fontStyle: "italic", opacity: 0.7 }}
                        />
                      )}
                    </td>
                    <td align="center">
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                        <Tooltip title="Modifier">
                          <IconButton size="small" color="primary" onClick={() => handleModifierLigne(index)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Retirer">
                          <IconButton size="small" color="error" onClick={() => handleRetirerLigne(index)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
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

  const renderActions = () => {
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
    if (activeStep === 2) {
      return (
        <>
          <Button onClick={handleBack} startIcon={<ArrowBackIcon />}>Précédent</Button>
          <Box sx={{ flex: 1 }} />
          <Button variant="outlined" onClick={handleAjouterEtContinuer} startIcon={<AddIcon />}>
            Ajouter un autre article
          </Button>
          <Button variant="contained" onClick={handleVoirRecap} endIcon={<ArrowForwardIcon />}>
            Voir le récapitulatif
          </Button>
        </>
      );
    }
    if (activeStep === STEPS.length - 1) {
      return (
        <>
          <Box sx={{ flex: 1 }} />
          <Button variant="outlined" onClick={handleAjouterAutreDepuisRecap} startIcon={<AddIcon />}>
            Ajouter un autre article
          </Button>
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
      actions={renderActions()}
    >
      {!employeeDemandeur && employees.length > 0 && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: "#FFF8E1", borderRadius: 1, border: "1px solid #F9A825" }}>
          <Typography variant="body2" color="primary.main">
            Votre compte utilisateur n'est pas lié à un employé.
            Vous ne pourrez pas créer de commande tant que ce n'est pas fait.
          </Typography>
        </Box>
      )}
      {renderStepContent()}
    </WizardDialog>
  );
}