import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Autocomplete,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
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
  demandeurParDefaut,
}) {
  const [employeSelectionne, setEmployeSelectionne] = useState(null);
  const [quantiteAttribution, setQuantiteAttribution] = useState("");

  const sommeAttribuee = attributions.reduce((sum, a) => sum + (Number(a.quantite) || 0), 0);
  const quantiteRestante = Number(quantiteTotale) - sommeAttribuee;

  // Filtrer par direction
  const employesDisponibles = employees.filter((e) => {
    const dejaAttribue = attributions.some((a) => a.employe?.emp_id === e.emp_id);
    if (dejaAttribue) return false;
    if (demandeurParDefaut?.emp_serv_id) {
      const dirDemandeur = demandeurParDefaut.emp_serv_id?.serv_dir_id;
      const dirEmploye = e.emp_serv_id?.serv_dir_id;
      if (dirDemandeur && dirEmploye) {
        return String(dirDemandeur) === String(dirEmploye);
      }
      return String(e.emp_serv_id) === String(demandeurParDefaut.emp_serv_id);
    }
    return true;
  });

  const ajouterAttribution = () => {
    if (!employeSelectionne) return;
    const qte = Number(quantiteAttribution);
    if (!qte || qte <= 0) return;
    if (qte > quantiteRestante) return;
    setAttributions([...attributions, { employe: employeSelectionne, quantite: qte }]);
    setEmployeSelectionne(null);
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

  return (
    <Box>
      <ProgressBar current={sommeAttribuee} total={quantiteTotale} label="Attribué" />

      <StyledTable
        columns={[
          { label: "Bénéficiaire" },
          { label: "Localisation", width: 180 },
          { label: "Quantité", align: "center", width: 120 },
          { label: "", align: "center", width: 60 },
        ]}
        emptyMessage="Aucune attribution. Vous recevrez toute la quantité."
      >
        {attributions.map((attr, index) => {
          const loc = getEmployeLocation(attr.employe);
          return (
            <tr key={index}>
              <td>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PersonIcon fontSize="small" color="primary" />
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {attr.employe.emp_nom}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {attr.employe.emp_matricule}
                      {attr.employe.emp_fonction ? ` • ${attr.employe.emp_fonction}` : ""}
                    </Typography>
                  </Box>
                </Box>
              </td>
              <td>
                <EmployeLocation employe={attr.employe} />
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
                  <IconButton size="small" color="error" onClick={() => retirerAttribution(index)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </td>
            </tr>
          );
        })}
      </StyledTable>

      <FormSection>
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
            <TextField {...params} label="Bénéficiaire" placeholder="Rechercher un employé..." />
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
          noOptionsText="Aucun employé disponible"
        />
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
            !employeSelectionne ||
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