import { useState, useMemo, useEffect } from "react";
import {
  Box, TextField, Button, Autocomplete, Tooltip, IconButton,
  Typography, ToggleButtonGroup, ToggleButton, Chip, FormControl, Select, MenuItem,
} from "@mui/material";
import {
  Add as AddIcon, Delete as DeleteIcon,
  Person as PersonIcon, Business as BusinessIcon,
  LocationCity as LocationCityIcon,
} from "@mui/icons-material";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS } from "../../../constants/api";
import { StyledTable } from "../../../components/wizard/StyledTable";
import { FormSection } from "../../../components/wizard/FormSection";
import { ProgressBar } from "../../../components/common/ProgressBar";
import { EmployeLocation, getEmployeLocation } from "../../../components/common/EmployeLocation";

const SITES_ENDPOINT = "/api/employee/sites/";

export function AttributionEditor({
  quantiteTotale,
  attributions,
  setAttributions,
  employees,
  directions = [],
  demandeurParDefaut,
  articleCourant,
}) {
  const isImmobilisation = articleCourant?.is_immobilisation !== false;
  const [typeBeneficiaire, setTypeBeneficiaire] = useState(isImmobilisation ? "EMPLOYE" : "DIRECTION");
  const [employeSelectionne, setEmployeSelectionne] = useState(null);
  const [directionSelectionnee, setDirectionSelectionnee] = useState(null);
  const [siteSelectionne, setSiteSelectionne] = useState(null);
  const [sites, setSites] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [quantiteAttribution, setQuantiteAttribution] = useState("");

  // Charger les sites
  useEffect(() => {
    let cancelled = false;
    setSitesLoading(true);
    apiClient.get(SITES_ENDPOINT, { params: { page_size: 100 } })
      .then((res) => { if (!cancelled) setSites(res.data.results ?? res.data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSitesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const sommeAttribuee = attributions.reduce(
    (sum, a) => sum + (Number(a.quantite) || 0),
    0
  );
  const quantiteRestante = Number(quantiteTotale) - sommeAttribuee;

  // Résolution de la direction du demandeur
  const directionDemandeur = useMemo(() => {
    return directions.find((d) => {
      if (demandeurParDefaut?.direction_libelle && d.dir_libelle) {
        return d.dir_libelle.trim().toLowerCase() === demandeurParDefaut.direction_libelle.trim().toLowerCase();
      }
      if (demandeurParDefaut?.emp_serv_id?.serv_dir_id) {
        return String(d.dir_id) === String(demandeurParDefaut.emp_serv_id.serv_dir_id);
      }
      return false;
    }) || (demandeurParDefaut?.direction_libelle ? {
      dir_id: directions[0]?.dir_id || 1,
      dir_libelle: demandeurParDefaut.direction_libelle,
      site_nom: demandeurParDefaut.site_nom,
    } : null);
  }, [directions, demandeurParDefaut]);

  const directionActive = directionSelectionnee || directionDemandeur || (directions.length > 0 ? directions[0] : null);

  useEffect(() => {
    if (!isImmobilisation && typeBeneficiaire !== "DIRECTION" && typeBeneficiaire !== "SITE") {
      setTypeBeneficiaire("DIRECTION");
      setEmployeSelectionne(null);
    }
  }, [isImmobilisation, typeBeneficiaire]);

  useEffect(() => {
    if (directionDemandeur && !directionSelectionnee) {
      setDirectionSelectionnee(directionDemandeur);
    }
  }, [directionDemandeur, directionSelectionnee]);

  const employesDisponibles = employees.filter((e) => {
    const dejaAttribue = attributions.some(
      (a) => a.type === "EMPLOYE" && a.beneficiaire?.emp_id === e.emp_id
    );
    if (dejaAttribue) return false;
    if (directionDemandeur?.dir_libelle && e.direction_libelle) {
      return e.direction_libelle.trim().toLowerCase() === directionDemandeur.dir_libelle.trim().toLowerCase();
    }
    return true;
  });

  const sitesDejaAttribues = attributions
    .filter((a) => a.type === "SITE")
    .map((a) => a.beneficiaire?.site_id);

  const ajouterAttribution = () => {
    const qte = Number(quantiteAttribution);
    if (!qte || qte <= 0 || qte > quantiteRestante) return;

    if (typeBeneficiaire === "EMPLOYE") {
      if (!employeSelectionne) return;
      setAttributions([
        ...attributions,
        { type: "EMPLOYE", beneficiaire: employeSelectionne, quantite: qte },
      ]);
      setEmployeSelectionne(null);
    } else if (typeBeneficiaire === "SITE") {
      if (!siteSelectionne) return;
      setAttributions([
        ...attributions,
        { type: "SITE", beneficiaire: siteSelectionne, quantite: qte },
      ]);
      setSiteSelectionne(null);
    } else {
      if (!directionActive) return;
      setAttributions([
        ...attributions,
        { type: "DIRECTION", beneficiaire: directionActive, quantite: qte },
      ]);
    }
    setQuantiteAttribution("");
  };

  const retirerAttribution = (index) => {
    setAttributions(attributions.filter((_, i) => i !== index));
  };

  const modifierQuantite = (index, nouvelleQuantite) => {
    const qte = Number(nouvelleQuantite);
    if (!qte || qte <= 0) return;
    const updated = [...attributions];
    updated[index] = { ...updated[index], quantite: qte };
    setAttributions(updated);
  };

  const handleTypeChange = (event, newType) => {
    if (newType !== null) {
      setTypeBeneficiaire(newType);
      setEmployeSelectionne(null);
      setSiteSelectionne(null);
      setQuantiteAttribution("");
    }
  };

  const getBeneficiaireId = (beneficiaire) => String(
    beneficiaire?.emp_id ?? beneficiaire?.dir_id ?? beneficiaire?.site_id ?? ""
  );

  const getBeneficiaireLabel = (beneficiaire) => {
    if (beneficiaire?.emp_id) {
      return `${beneficiaire.emp_nom}${beneficiaire.emp_matricule ? ` (${beneficiaire.emp_matricule})` : ""}`;
    }
    if (beneficiaire?.site_id) {
      return `${beneficiaire.site_nom} (${beneficiaire.site_type || "Site"})`;
    }
    return beneficiaire?.dir_libelle || "";
  };

  const modifierBeneficiaire = (index, beneficiaire) => {
    if (!beneficiaire) return;
    const type = beneficiaire.emp_id ? "EMPLOYE" : beneficiaire.site_id ? "SITE" : "DIRECTION";
    const updated = [...attributions];
    updated[index] = { ...updated[index], type, beneficiaire };
    setAttributions(updated);
  };

  const modifierType = (index, type) => {
    const updated = [...attributions];
    updated[index] = { ...updated[index], type, beneficiaire: null };
    setAttributions(updated);
  };

  const getBeneficiaireOptions = (type, currentIndex = -1) => {
    if (type === "EMPLOYE") {
      return employees.filter((employee) => {
        const dejaAttribue = attributions.some(
          (attribution, index) => index !== currentIndex &&
          attribution.type === "EMPLOYE" &&
          attribution.beneficiaire?.emp_id === employee.emp_id
        );
        if (dejaAttribue) return false;
        if (directionDemandeur?.dir_libelle && employee.direction_libelle) {
          return employee.direction_libelle.trim().toLowerCase() === directionDemandeur.dir_libelle.trim().toLowerCase();
        }
        return true;
      });
    }
    if (type === "SITE") {
      return sites.filter((s) => !sitesDejaAttribues.includes(s.site_id));
    }
    return directionActive ? [directionActive] : [];
  };

  return (
    <Box>
      <ProgressBar current={sommeAttribuee} total={quantiteTotale} label="Attribué" />

      {/* Toggle Type de bénéficiaire */}
      <Box sx={{ mb: 2 }}>
        <ToggleButtonGroup
          value={typeBeneficiaire}
          exclusive
          onChange={handleTypeChange}
          size="small"
          sx={{
            "& .MuiToggleButton-root": {
              px: 2,
              py: 0.75,
              border: "1px solid #E0E0E0",
              "&.Mui-selected": {
                bgcolor: "primary.light",
                borderColor: "primary.main",
                color: "text.primary",
                "&:hover": { bgcolor: "primary.main", color: "white" },
              },
            },
          }}
        >
          <ToggleButton value="EMPLOYE" disabled={!isImmobilisation}>
            <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
            Employé
          </ToggleButton>
          <ToggleButton value="DIRECTION">
            <BusinessIcon fontSize="small" sx={{ mr: 0.5 }} />
            Direction
          </ToggleButton>
          <ToggleButton value="SITE">
            <LocationCityIcon fontSize="small" sx={{ mr: 0.5 }} />
            Site
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <StyledTable
        columns={[
          { label: "Type", width: 140 },
          { label: "Bénéficiaire" },
          { label: "Quantité", align: "center", width: 120 },
          { label: "", align: "center", width: 120 },
        ]}
        emptyMessage="Aucune attribution. Vous recevrez toute la quantité."
      >
        {attributions.map((attr, index) => {
          const isEmploye = attr.type === "EMPLOYE";
          const isDirection = attr.type === "DIRECTION";
          const isSite = attr.type === "SITE";
          const loc = isEmploye ? getEmployeLocation(attr.beneficiaire) : null;

          return (
            <tr key={index}>
              <td>
                <FormControl size="small" fullWidth>
                  <Select
                    value={attr.type}
                    onChange={(event) => modifierType(index, event.target.value)}
                  >
                    <MenuItem value="EMPLOYE" disabled={!isImmobilisation}>Employé</MenuItem>
                    <MenuItem value="DIRECTION">Direction</MenuItem>
                    <MenuItem value="SITE">Site</MenuItem>
                  </Select>
                </FormControl>
              </td>
              <td>
                <FormControl size="small" fullWidth>
                  <Select
                    value={getBeneficiaireId(attr.beneficiaire)}
                    onChange={(event) => {
                      const beneficiaire = getBeneficiaireOptions(attr.type, index)
                        .find((option) => getBeneficiaireId(option) === event.target.value);
                      modifierBeneficiaire(index, beneficiaire);
                    }}
                  >
                    {getBeneficiaireOptions(attr.type, index).map((option) => (
                      <MenuItem key={getBeneficiaireId(option)} value={getBeneficiaireId(option)}>
                        {getBeneficiaireLabel(option)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </td>
              <td align="center">
                <TextField
                  type="number"
                  size="small"
                  value={attr.quantite}
                  onChange={(e) => modifierQuantite(index, e.target.value)}
                  inputProps={{ min: 1, max: quantiteTotale }}
                  sx={{ width: 90 }}
                />
              </td>
              <td align="center">
                <Tooltip title="Retirer">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => retirerAttribution(index)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </td>
            </tr>
          );
        })}
        <tr>
          <td>
            <FormControl size="small" fullWidth>
              <Select value={typeBeneficiaire} label="Type" onChange={handleTypeChange}>
                <MenuItem value="EMPLOYE" disabled={!isImmobilisation}>Employé</MenuItem>
                <MenuItem value="DIRECTION">Direction</MenuItem>
                <MenuItem value="SITE">Site</MenuItem>
              </Select>
            </FormControl>
          </td>
          <td>
            {typeBeneficiaire === "EMPLOYE" ? (
              <FormControl size="small" fullWidth>
                <Select
                  value={getBeneficiaireId(employeSelectionne)}
                  label="Employé"
                  onChange={(event) => setEmployeSelectionne(
                    employesDisponibles.find((employee) => getBeneficiaireId(employee) === event.target.value) || null
                  )}
                >
                  {employesDisponibles.map((employee) => (
                    <MenuItem key={employee.emp_id} value={getBeneficiaireId(employee)}>
                      {getBeneficiaireLabel(employee)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : typeBeneficiaire === "SITE" ? (
              <Autocomplete
                size="small"
                options={sites.filter((s) => !sitesDejaAttribues.includes(s.site_id))}
                loading={sitesLoading}
                getOptionLabel={(option) => `${option.site_nom} (${option.site_type})`}
                isOptionEqualToValue={(option, value) => option?.site_id === value?.site_id}
                value={siteSelectionne}
                onChange={(_, newValue) => setSiteSelectionne(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Site" placeholder="Rechercher un site..." />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.site_id}>
                    <Box sx={{ width: "100%", display: "flex", alignItems: "center", gap: 1 }}>
                      <LocationCityIcon fontSize="small" sx={{ color: "warning.main" }} />
                      <Box>
                        <Typography variant="body2" fontWeight={500}>{option.site_nom}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.site_type} • {option.localite || "—"}
                        </Typography>
                      </Box>
                    </Box>
                  </li>
                )}
                noOptionsText="Aucun site trouvé"
              />
            ) : (
              <TextField
                size="small"
                value={
                  directionActive
                    ? `${directionActive.dir_libelle}${directionActive.site_nom ? ` (${directionActive.site_nom})` : ""}`
                    : "Direction non définie"
                }
                InputProps={{ readOnly: true }}
                fullWidth
              />
            )}
          </td>
          <td align="center">
            <TextField
              label="Quantité"
              type="number"
              size="small"
              value={quantiteAttribution}
              onChange={(e) => setQuantiteAttribution(e.target.value)}
              inputProps={{ min: 1, max: quantiteRestante }}
              placeholder={`Max: ${Math.max(quantiteRestante, 0)}`}
              sx={{ width: 100 }}
            />
          </td>
          <td align="center">
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={ajouterAttribution}
              disabled={
                quantiteRestante <= 0 ||
                (typeBeneficiaire === "EMPLOYE"
                  ? !employeSelectionne
                  : typeBeneficiaire === "SITE"
                  ? !siteSelectionne
                  : !directionActive) ||
                !quantiteAttribution ||
                Number(quantiteAttribution) <= 0 ||
                Number(quantiteAttribution) > quantiteRestante
              }
            >
              Ajouter
            </Button>
          </td>
        </tr>
      </StyledTable>
    </Box>
  );
}