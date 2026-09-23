import { useState, useMemo, useEffect } from "react";
import {
  Box, TextField, Button, Select, MenuItem, FormControl, InputLabel, Tooltip, IconButton,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon, Delete as DeleteIcon,
  Person as PersonIcon, Business as BusinessIcon,
} from "@mui/icons-material";
import { StyledTable } from "../../../components/wizard/StyledTable";

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
    return directionActive ? [directionActive] : [];
  };

  const modifierBeneficiaire = (index, beneficiaire) => {
    if (!beneficiaire) return;
    const type = beneficiaire.emp_id ? "EMPLOYE" : "DIRECTION";
    const updated = [...attributions];
    updated[index] = { ...updated[index], type, beneficiaire };
    setAttributions(updated);
  };

  const modifierType = (index, type) => {
    const updated = [...attributions];
    updated[index] = { ...updated[index], type, beneficiaire: null };
    setAttributions(updated);
  };

  const getBeneficiaireId = (beneficiaire) => String(
    beneficiaire?.emp_id ?? beneficiaire?.dir_id ?? ""
  );

  const getBeneficiaireLabel = (beneficiaire) => {
    if (beneficiaire?.emp_id) {
      return `${beneficiaire.emp_nom}${beneficiaire.emp_matricule ? ` (${beneficiaire.emp_matricule})` : ""}`;
    }
    return beneficiaire?.dir_libelle || "";
  };

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

  const handleTypeChange = (event) => {
    setTypeBeneficiaire(event.target.value);
    setEmployeSelectionne(null);
    setQuantiteAttribution("");
  };

  return (
    <Box>

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