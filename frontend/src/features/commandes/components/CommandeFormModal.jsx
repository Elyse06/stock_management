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
  ArrowForward as ArrowForwardIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  Inventory as InventoryIcon,
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
import { AttributionEditor } from "./AttributionEditor";
import { Chip } from "@mui/material";

const STEPS = [
  { label: "Articles", icon: <InventoryIcon /> },
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
  const [objet, setObjet] = useState("Utilisation simple");
  const [lignes, setLignes] = useState([]);
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

  const ligneVide = () => ({
    article: "",
    article_designation: "",
    stock_calcule: 0,
    is_immobilisation: true,
    quantite: 1,
    attributions: [],
  });

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
      setLignes(lignesTransformees.length > 0 ? lignesTransformees : [ligneVide()]);
    } else {
      setObjet("Utilisation simple");
      setLignes([ligneVide()]);
    }
    setActiveStep(0);
  }, [isOpen, commandeToEdit, articles, employees, directions]);

  const handleClose = () => {
    setObjet("Utilisation simple");
    setLignes([]);
    setActiveStep(0);
    onClose();
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };

  const lignesValides = lignes.filter((ligne) => ligne.article && Number(ligne.quantite) > 0);

  const modifierLigne = (index, changements) => {
    setLignes((precedentes) => precedentes.map((ligne, ligneIndex) => (
      ligneIndex === index ? { ...ligne, ...changements } : ligne
    )));
  };

  const ajouterLigne = () => setLignes((precedentes) => [...precedentes, ligneVide()]);

  const retirerLigne = (index) => {
    setLignes((precedentes) => {
      const restantes = precedentes.filter((_, ligneIndex) => ligneIndex !== index);
      return restantes.length > 0 ? restantes : [ligneVide()];
    });
  };

  const handleVoirRecap = () => {
    if (lignesValides.length > 0) {
      setActiveStep(1);
    } else {
      notify.error("Ajoutez au moins un article à la commande.");
    }
  };

  const handleAjouterAutreDepuisRecap = () => {
    ajouterLigne();
    setActiveStep(0);
  };

  const handleSubmit = async () => {
    if (lignesValides.length === 0) {
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
      const detailsPayload = lignesValides.map((ligne) => {
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
              item.employe_beneficiaire = a.beneficiaire_id || a.beneficiaire?.emp_id;
            } else {
              item.direction_beneficiaire = a.beneficiaire_id || a.beneficiaire?.dir_id;
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
            <StyledTable columns={[{ label: "Article", minWidth: 250 }, { label: "Quantité", width: 130 }, { label: "Attribution", minWidth: 420 }, { label: "", width: 60 }]}>
              {lignes.map((ligne, index) => {
                const article = articles.find((item) => item.code_article === ligne.article);
                return (
                  <tr key={index}>
                    <td>
                      <Autocomplete
                        size="small"
                        options={articles}
                        value={article || null}
                        getOptionLabel={(option) => option
                          ? `${option.designation} - ${option.categorie_nom || "Sans catégorie"} - Stock : ${option.stock_calcule ?? 0}`
                          : ""}
                        isOptionEqualToValue={(option, value) => option?.code_article === value?.code_article}
                        onChange={(_, value) => modifierLigne(index, {
                          article: value?.code_article || "",
                          article_designation: value?.designation || "",
                          stock_calcule: value?.stock_calcule ?? 0,
                          is_immobilisation: value?.is_immobilisation !== false,
                          attributions: [],
                        })}
                        renderOption={(props, option) => (
                          <li {...props} key={option.code_article}>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {option.designation}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {option.categorie_nom || "Sans catégorie"} - Stock : {option.stock_calcule ?? 0}
                              </Typography>
                            </Box>
                          </li>
                        )}
                        renderInput={(params) => <TextField {...params} label="Article" placeholder="Rechercher..." />}
                        noOptionsText="Aucun article trouvé"
                      />
                    </td>
                    <td>
                      <TextField
                        size="small"
                        fullWidth
                        type="number"
                        value={ligne.quantite}
                        onChange={(event) => modifierLigne(index, { quantite: event.target.value })}
                        inputProps={{ min: 1, step: 1 }}
                        error={Boolean(ligne.article && (!ligne.quantite || Number(ligne.quantite) <= 0))}
                      />
                    </td>
                    <td>
                      <AttributionEditor
                        quantiteTotale={Number(ligne.quantite)}
                        attributions={ligne.attributions}
                        setAttributions={(attributions) => modifierLigne(index, { attributions })}
                        employees={employees}
                        directions={directions}
                        demandeurParDefaut={employeeDemandeur}
                        articleCourant={article || ligne}
                      />
                    </td>
                    <td align="center">
                      <Tooltip title="Retirer la ligne">
                        <IconButton size="small" color="error" onClick={() => retirerLigne(index)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </td>
                  </tr>
                );
              })}
            </StyledTable>
            <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={ajouterLigne}>
              Ajouter une ligne
            </Button>
          </Box>
        );

      case 1:
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
              Articles commandés ({lignesValides.length})
            </Typography>
            {lignesValides.length === 0 ? (
              <Box sx={{ p: 2, bgcolor: "#FFF8E1", borderRadius: 1 }}>
                <Typography variant="body2" color="primary.main">
                  Aucun article ajouté. Veuillez revenir en arrière pour en ajouter.
                </Typography>
              </Box>
            ) : (
              <StyledTable
                columns={[
                  { label: "Article" },
                  { label: "Quantité", align: "center", width: 50 },
                  { label: "Bénéficiaire", width: 220 },
                  { label: "Actions", align: "center", width: 90 },
                ]}
              >
                {lignesValides.map((ligne) => {
                  const ligneIndex = lignes.indexOf(ligne);
                  return (
                  <tr key={ligneIndex}>
                    <td>
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
                            const beneficiaireNom = isEmploye
                              ? employees.find((e) => e.emp_id === attr.beneficiaire_id)?.emp_nom
                                || attr.beneficiaire?.emp_nom
                                || attr.beneficiaire_nom
                                || "Employé"
                              : attr.beneficiaire?.dir_libelle
                                || attr.beneficiaire_nom
                                || "Direction";

                            return (
                              <Box key={idx} sx={{ mb: 0.5 }}>
                                <Chip
                                  label={`${beneficiaireNom} (${attr.quantite})`}
                                  size="small"
                                  color={isEmploye ? "primary" : "secondary"}
                                  variant="outlined"
                                  icon={isEmploye ? <PersonIcon /> : <BusinessIcon />}
                                />
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
                        <Tooltip title="Modifier dans la table">
                          <IconButton size="small" color="primary" onClick={() => setActiveStep(0)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Retirer">
                          <IconButton size="small" color="error" onClick={() => retirerLigne(ligneIndex)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </td>
                  </tr>
                  );
                })}
              </StyledTable>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  const renderActions = () => {
    if (activeStep === 0) {
      return (
        <>
          <Box sx={{ flex: 1 }} />
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
            disabled={lignesValides.length === 0 || !objet}
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
      maxWidth="xl"
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