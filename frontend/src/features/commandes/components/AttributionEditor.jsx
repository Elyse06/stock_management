import { useState, useMemo, useEffect } from "react";
import {
  Box, TextField, Button, Autocomplete, Tooltip, IconButton, 
  ToggleButtonGroup, ToggleButton, Typography, Chip,
} from "@mui/material";
import {
  Add as AddIcon, Delete as DeleteIcon,
  Person as PersonIcon, Business as BusinessIcon,
} from "@mui/icons-material";
import { StyledTable } from "../../../components/wizard/StyledTable";
import { FormSection } from "../../../components/wizard/FormSection";
import { ProgressBar } from "../../../components/common/ProgressBar";
import { EmployeLocation, getEmployeLocation } from "../../../components/common/EmployeLocation";

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
  const [quantiteAttribution, setQuantiteAttribution] = useState("");

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

  // Forcer direction si fourniture
  useEffect(() => {
    if (!isImmobilisation && typeBeneficiaire !== "DIRECTION") {
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

  const ajouterAttribution = () => {
    const qte = Number(quantiteAttribution);
    if (!qte || qte <= 0 || qte > quantiteRestante) return;

    if (typeBeneficiaire === "EMPLOYE") {
      if (!employeSelectionne) return;

      setAttributions([
        ...attributions,
        {
          type: "EMPLOYE",
          beneficiaire: employeSelectionne,
          quantite: qte,
        },
      ]);
      setEmployeSelectionne(null);
      setQuantiteAttribution("");
    } else {
      if (!directionActive) return;

      setAttributions([
        ...attributions,
        {
          type: "DIRECTION",
          beneficiaire: directionActive,
          quantite: qte,
        },
      ]);
      setQuantiteAttribution("");
    }
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
      setQuantiteAttribution("");
    }
  };

  return (
    <Box>
      <ProgressBar current={sommeAttribuee} total={quantiteTotale} label="Attribué" />

      {!isImmobilisation && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: "#E3F2FD", borderRadius: 1, border: "1px solid #90CAF9" }}>
          <Typography variant="body2" color="info.main">
            ℹ️ Cet article est une fourniture / consommable : l'attribution est réservée aux directions.
          </Typography>
        </Box>
      )}

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
                "&:hover": {
                  bgcolor: "primary.main",
                  color: "white",
                },
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
        </ToggleButtonGroup>
      </Box>

      <StyledTable
        columns={[
          { label: "Bénéficiaire" },
          { label: "Type", width: 120 },
          { label: "Localisation", width: 180 },
          { label: "Quantité", align: "center", width: 120 },
          { label: "", align: "center", width: 60 },
        ]}
        emptyMessage="Aucune attribution. Vous recevrez toute la quantité."
      >
        {attributions.map((attr, index) => {
          const isEmploye = attr.type === "EMPLOYE";

          return (
            <tr key={index}>
              <td>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {isEmploye ? (
                    <PersonIcon fontSize="small" color="primary" />
                  ) : (
                    <BusinessIcon fontSize="small" color="secondary" />
                  )}
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {isEmploye
                        ? attr.beneficiaire.emp_nom
                        : attr.beneficiaire.dir_libelle}
                    </Typography>
                    {isEmploye && (
                      <Typography variant="caption" color="text.secondary">
                        {attr.beneficiaire.emp_matricule}
                        {attr.beneficiaire.emp_fonction
                          ? ` • ${attr.beneficiaire.emp_fonction}`
                          : ""}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </td>
              <td>
                <Chip
                  label={isEmploye ? "Employé" : "Direction"}
                  size="small"
                  color={isEmploye ? "primary" : "secondary"}
                  variant="outlined"
                  icon={isEmploye ? <PersonIcon /> : <BusinessIcon />}
                />
              </td>
              <td>
                {isEmploye ? (
                  <EmployeLocation employe={attr.beneficiaire} />
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    {attr.beneficiaire.site_nom || "—"}
                  </Typography>
                )}
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
      </StyledTable>

      <FormSection>
        {typeBeneficiaire === "EMPLOYE" ? (
          <Autocomplete
            size="small"
            options={employesDisponibles}
            getOptionLabel={(option) =>
              option?.emp_nom ? `${option.emp_nom} (${option.emp_matricule})` : ""
            }
            isOptionEqualToValue={(option, value) => option?.emp_id === value?.emp_id}
            value={employeSelectionne}
            onChange={(_, newValue) => setEmployeSelectionne(newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Employé" placeholder="Rechercher un employé..." />
            )}
            renderOption={(props, option) => {
              const loc = getEmployeLocation(option);
              return (
                <li {...props} key={option.emp_id}>
                  <Box sx={{ width: "100%" }}>
                    <Typography variant="body2" fontWeight={500}>
                      {option.emp_nom}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.emp_matricule}
                      {option.emp_fonction ? ` • ${option.emp_fonction}` : ""}
                    </Typography>
                    {loc && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                        <BusinessIcon sx={{ fontSize: 12 }} />
                        <Typography variant="caption" color="text.secondary">
                          {loc.site ? `${loc.site} → ` : ""}
                          {loc.direction || "—"}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </li>
              );
            }}
            noOptionsText="Aucun employé disponible dans votre direction"
          />
        ) : (
          <TextField
            size="small"
            label="Direction bénéficiaire"
            value={
              directionDemandeur
                ? `${directionDemandeur.dir_libelle}${directionDemandeur.site_nom ? ` (${directionDemandeur.site_nom})` : ""}`
                : "Direction non définie"
            }
            InputProps={{
              readOnly: true,
              startAdornment: (
                <BusinessIcon sx={{ fontSize: 18, color: "primary.main", mr: 1 }} />
              ),
            }}
            helperText="L'attribution est restreinte à votre direction"
            sx={{ "& .MuiInputBase-input": { cursor: "default" } }}
            fullWidth
          />
        )}

        <TextField
          label="Quantité"
          type="number"
          size="small"
          value={quantiteAttribution}
          onChange={(e) => setQuantiteAttribution(e.target.value)}
          inputProps={{ min: 1, max: quantiteRestante }}
          placeholder={`Max: ${quantiteRestante}`}
        />

        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={ajouterAttribution}
          disabled={
            typeBeneficiaire === "EMPLOYE"
              ? !employeSelectionne ||
                !quantiteAttribution ||
                Number(quantiteAttribution) <= 0 ||
                Number(quantiteAttribution) > quantiteRestante
              : !directionActive ||
                !quantiteAttribution ||
                Number(quantiteAttribution) <= 0 ||
                Number(quantiteAttribution) > quantiteRestante
          }
          sx={{ minWidth: 110, height: 40 }}
        >
          Ajouter
        </Button>
      </FormSection>
    </Box>
  );
}