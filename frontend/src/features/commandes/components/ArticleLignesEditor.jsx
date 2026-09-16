import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
} from "@mui/icons-material";
import { apiClient } from "../../../api/client";
import { StyledTable } from "../../../components/wizard/StyledTable";
import { FormSection } from "../../../components/wizard/FormSection";
import { CodeChip } from "../../../components/common/CodeChip";
import { StockStatusChip } from "../../../components/common/StockStatusChip";
import { EmployeLocation, getEmployeLocation } from "../../../components/common/EmployeLocation";
import { EmptyValue } from "../../../components/common/EmptyValue";

const EMPLOYEES_ENDPOINT = "/api/employee/employee/";

export function ArticleLignesEditor({ lignes, setLignes, articles }) {
  const [articleCode, setArticleCode] = useState("");
  const [quantite, setQuantite] = useState("");
  const [beneficiaireId, setBeneficiaireId] = useState("");
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setEmployeesLoading(true);
    apiClient
      .get(EMPLOYEES_ENDPOINT, { params: { page_size: 500 } })
      .then((res) => {
        if (cancelled) return;
        setEmployees(res.data.results ?? res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setEmployeesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ajouterLigne = () => {
    if (!articleCode || !quantite || Number(quantite) <= 0) return;
    const article = articles.find((a) => String(a.code_article) === String(articleCode));
    const beneficiaire = employees.find((e) => String(e.emp_id) === String(beneficiaireId));

    setLignes([
      ...lignes,
      {
        article: articleCode,
        article_designation: article?.designation || articleCode,
        stock_calcule: article?.stock_calcule ?? 0,
        quantite: Number(quantite),
        employe_beneficiaire: beneficiaireId || null,
        beneficiaire_nom: beneficiaire?.emp_nom || null,
        beneficiaire_direction: beneficiaire?.emp_serv_id?.serv_dir_id?.dir_libelle || null,
        beneficiaire_site: beneficiaire?.emp_serv_id?.serv_dir_id?.site?.site_nom || null,
      },
    ]);
    setArticleCode("");
    setQuantite("");
    setBeneficiaireId("");
  };

  const retirerLigne = (index) => {
    setLignes(lignes.filter((_, i) => i !== index));
  };

  return (
    <Box>
      <StyledTable
        columns={[
          { label: "Article" },
          { label: "Stock actuel", align: "center", width: 110 },
          { label: "Quantité", align: "center", width: 110 },
          {
            label: (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <PersonIcon fontSize="small" color="action" />
                <span>Bénéficiaire</span>
              </Box>
            ),
            width: 200,
          },
          { label: "Statut", align: "center", width: 160 },
          { label: "", align: "center", width: 60 },
        ]}
        emptyMessage="Aucune ligne ajoutée"
      >
        {lignes.map((ligne, index) => (
          <tr key={index}>
            <td>
              <CodeChip value={ligne.article} />
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.3 }}>
                {ligne.article_designation}
              </Typography>
            </td>
            <td align="center">
              <Typography variant="body2" fontFamily="monospace">
                {ligne.stock_calcule ?? 0}
              </Typography>
            </td>
            <td align="center">
              <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                {ligne.quantite}
              </Typography>
            </td>
            <td>
              {ligne.beneficiaire_nom ? (
                <Box>
                  <Chip
                    label={ligne.beneficiaire_nom}
                    size="small"
                    color="primary"
                    variant="outlined"
                    icon={<PersonIcon />}
                  />
                  {ligne.beneficiaire_direction && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.3 }}>
                      <BusinessIcon sx={{ fontSize: 12 }} color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {ligne.beneficiaire_site ? `${ligne.beneficiaire_site} → ` : ""}
                        {ligne.beneficiaire_direction}
                      </Typography>
                    </Box>
                  )}
                </Box>
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
              <StockStatusChip stockActuel={ligne.stock_calcule} quantiteDemandee={ligne.quantite} />
            </td>
            <td align="center">
              <Tooltip title="Retirer la ligne">
                <IconButton size="small" color="error" onClick={() => retirerLigne(index)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </td>
          </tr>
        ))}
      </StyledTable>

      <FormSection>
        <FormControl size="small" fullWidth>
          <InputLabel>Article</InputLabel>
          <Select value={articleCode} label="Article" onChange={(e) => setArticleCode(e.target.value)}>
            <MenuItem value="" disabled>
              Choisir un article...
            </MenuItem>
            {articles.map((a) => (
              <MenuItem key={a.code_article} value={a.code_article}>
                {a.code_article} - {a.designation} (stock: {a.stock_calcule ?? 0})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Quantité"
          type="number"
          size="small"
          value={quantite}
          onChange={(e) => setQuantite(e.target.value)}
          inputProps={{ min: 1, step: 1 }}
          placeholder="0"
        />
        <Autocomplete
          size="small"
          options={employees}
          loading={employeesLoading}
          getOptionLabel={(option) =>
            option?.emp_nom ? `${option.emp_nom}${option.emp_matricule ? ` (${option.emp_matricule})` : ""}` : ""
          }
          isOptionEqualToValue={(option, value) => String(option?.emp_id) === String(value?.emp_id)}
          value={employees.find((e) => String(e.emp_id) === String(beneficiaireId)) || null}
          onChange={(_, newValue) => {
            setBeneficiaireId(newValue?.emp_id || "");
          }}
          renderInput={(params) => (
            <TextField {...params} label="Bénéficiaire (optionnel)" placeholder="Laisser vide = demandeur" />
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
                    {option.emp_contact ? ` • ${option.emp_contact}` : ""}
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
          noOptionsText="Aucun employé trouvé"
        />
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={ajouterLigne}
          disabled={!articleCode || !quantite || Number(quantite) <= 0}
          sx={{ minWidth: 120, height: 40 }}
        >
          Ajouter
        </Button>
      </FormSection>
    </Box>
  );
}