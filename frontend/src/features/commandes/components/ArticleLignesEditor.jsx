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
  IconButton,
  Typography,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
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
import {
  EmployeLocation,
  getEmployeLocation,
} from "../../../components/common/EmployeLocation";
import { EmptyValue } from "../../../components/common/EmptyValue";

const EMPLOYEES_ENDPOINT = "/api/employee/employee/";
const DIRECTIONS_ENDPOINT = "/api/employee/direction/";

export function ArticleLignesEditor({ lignes, setLignes, articles }) {
  const [articleCode, setArticleCode] = useState("");
  const [quantite, setQuantite] = useState("");
  const [typeBeneficiaire, setTypeBeneficiaire] = useState("EMPLOYE");
  const [beneficiaireId, setBeneficiaireId] = useState("");
  const [employees, setEmployees] = useState([]);
  const [directions, setDirections] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiClient.get(EMPLOYEES_ENDPOINT, { params: { page_size: 500 } }),
      apiClient.get(DIRECTIONS_ENDPOINT, { params: { page_size: 100 } }),
    ])
      .then(([empRes, dirRes]) => {
        if (cancelled) return;
        setEmployees(empRes.data.results ?? empRes.data);
        setDirections(dirRes.data.results ?? dirRes.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ajouterLigne = () => {
    if (!articleCode || !quantite || Number(quantite) <= 0) return;
    const article = articles.find(
      (a) => String(a.code_article) === String(articleCode)
    );

    let beneficiaireData = null;
    let beneficiaireNom = null;
    let beneficiaireDirection = null;
    let beneficiaireSite = null;

    if (typeBeneficiaire === "EMPLOYE" && beneficiaireId) {
      const employe = employees.find(
        (e) => String(e.emp_id) === String(beneficiaireId)
      );
      if (employe) {
        beneficiaireData = {
          type: "EMPLOYE",
          id: employe.emp_id,
        };
        beneficiaireNom = employe.emp_nom;
        const service = employe.emp_serv_id;
        const direction = service?.serv_dir_id;
        const site = direction?.site;
        beneficiaireDirection = direction?.dir_libelle || null;
        beneficiaireSite = site?.site_nom || null;
      }
    } else if (typeBeneficiaire === "DIRECTION" && beneficiaireId) {
      const direction = directions.find(
        (d) => String(d.dir_id) === String(beneficiaireId)
      );
      if (direction) {
        beneficiaireData = {
          type: "DIRECTION",
          id: direction.dir_id,
        };
        beneficiaireNom = direction.dir_libelle;
        beneficiaireDirection = direction.dir_libelle;
        beneficiaireSite = direction.site_nom || null;
      }
    }

    setLignes([
      ...lignes,
      {
        article: articleCode,
        article_designation: article?.designation || articleCode,
        stock_calcule: article?.stock_calcule ?? 0,
        quantite: Number(quantite),
        beneficiaire_type: beneficiaireData?.type || null,
        beneficiaire_id: beneficiaireData?.id || null,
        beneficiaire_nom: beneficiaireNom || null,
        beneficiaire_direction: beneficiaireDirection || null,
        beneficiaire_site: beneficiaireSite || null,
      },
    ]);

    setArticleCode("");
    setQuantite("");
    setBeneficiaireId("");
  };

  const retirerLigne = (index) => {
    setLignes(lignes.filter((_, i) => i !== index));
  };

  const handleTypeChange = (event, newType) => {
    if (newType !== null) {
      setTypeBeneficiaire(newType);
      setBeneficiaireId("");
    }
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
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.3 }}
              >
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
                    color={
                      ligne.beneficiaire_type === "EMPLOYE"
                        ? "primary"
                        : "secondary"
                    }
                    variant="outlined"
                    icon={
                      ligne.beneficiaire_type === "EMPLOYE" ? (
                        <PersonIcon />
                      ) : (
                        <BusinessIcon />
                      )
                    }
                  />
                  {ligne.beneficiaire_direction && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        mt: 0.3,
                      }}
                    >
                      <BusinessIcon sx={{ fontSize: 12 }} color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {ligne.beneficiaire_site
                          ? `${ligne.beneficiaire_site} → `
                          : " "}
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
              <StockStatusChip
                stockActuel={ligne.stock_calcule}
                quantiteDemandee={ligne.quantite}
              />
            </td>
            <td align="center">
              <Tooltip title="Retirer la ligne">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => retirerLigne(index)}
                >
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
          <Select
            value={articleCode}
            label="Article"
            onChange={(e) => setArticleCode(e.target.value)}
          >
            <MenuItem value="" disabled>
              Choisir un article...
            </MenuItem>
            {articles.map((a) => (
              <MenuItem key={a.code_article} value={a.code_article}>
                {a.code_article} - {a.designation} (stock:{" "}
                {a.stock_calcule ?? 0})
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

        {/* 🆕 Toggle Type de bénéficiaire */}
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
          <ToggleButton value="EMPLOYE">
            <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
            Employé
          </ToggleButton>
          <ToggleButton value="DIRECTION">
            <BusinessIcon fontSize="small" sx={{ mr: 0.5 }} />
            Direction
          </ToggleButton>
        </ToggleButtonGroup>

        {/* 🆕 Sélecteur conditionnel */}
        {typeBeneficiaire === "EMPLOYE" ? (
          <Autocomplete
            size="small"
            options={employees}
            loading={loading}
            getOptionLabel={(option) =>
              option?.emp_nom
                ? `${option.emp_nom}${
                    option.emp_matricule ? ` (${option.emp_matricule})` : ""
                  }`
                : ""
            }
            isOptionEqualToValue={(option, value) =>
              String(option?.emp_id) === String(value?.emp_id)
            }
            value={
              employees.find((e) => String(e.emp_id) === String(beneficiaireId)) ||
              null
            }
            onChange={(_, newValue) => {
              setBeneficiaireId(newValue?.emp_id || "");
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Bénéficiaire (optionnel)"
                placeholder="Laisser vide = demandeur"
              />
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
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          mt: 0.5,
                        }}
                      >
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
        ) : (
          <Autocomplete
            size="small"
            options={directions}
            loading={loading}
            getOptionLabel={(option) =>
              option?.dir_libelle
                ? `${option.dir_libelle}${
                    option.site_nom ? ` (${option.site_nom})` : ""
                  }`
                : ""
            }
            isOptionEqualToValue={(option, value) =>
              String(option?.dir_id) === String(value?.dir_id)
            }
            value={
              directions.find((d) => String(d.dir_id) === String(beneficiaireId)) ||
              null
            }
            onChange={(_, newValue) => {
              setBeneficiaireId(newValue?.dir_id || "");
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Direction (optionnel)"
                placeholder="Laisser vide = direction du demandeur"
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.dir_id}>
                <Box sx={{ width: "100%" }}>
                  <Typography variant="body2" fontWeight={500}>
                    {option.dir_libelle}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.site_nom || "—"} • {option.site_type || "—"}
                  </Typography>
                </Box>
              </li>
            )}
            noOptionsText="Aucune direction trouvée"
          />
        )}

        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={ajouterLigne}
          disabled={
            !articleCode ||
            !quantite ||
            Number(quantite) <= 0 ||
            (typeBeneficiaire === "EMPLOYE" &&
              beneficiaireId &&
              !employees.find((e) => String(e.emp_id) === String(beneficiaireId))) ||
            (typeBeneficiaire === "DIRECTION" &&
              beneficiaireId &&
              !directions.find((d) => String(d.dir_id) === String(beneficiaireId)))
          }
          sx={{ minWidth: 120, height: 40 }}
        >
          Ajouter
        </Button>
      </FormSection>
    </Box>
  );
}