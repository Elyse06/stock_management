import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  IconButton,
  Button,
  Tooltip,
  Chip,
  Autocomplete,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { apiClient } from "../../../api/client";

// ✅ Endpoint corrigé (singulier, d'après le YAML OpenAPI)
const EMPLOYEES_ENDPOINT = "/api/employee/employee/";

/**
 * Éditeur des lignes article/quantité/bénéficiaire d'une commande.
 *
 * Règles métier :
 * - 1 ligne = 1 article + 1 quantité + 1 bénéficiaire (optionnel)
 * - Si bénéficiaire vide → backend attribue automatiquement au demandeur
 * - Fonctionne en local (le parent envoie les lignes lors de l'enregistrement)
 *
 * Props :
 * - lignes : array des lignes actuelles
 * - setLignes : setter pour mettre à jour les lignes
 * - articles : array des articles disponibles { code_article, designation, stock_calcule }
 */
export function ArticleLignesEditor({ lignes, setLignes, articles }) {
  const [articleCode, setArticleCode] = useState("");
  const [quantite, setQuantite] = useState("");
  const [beneficiaireId, setBeneficiaireId] = useState("");

  // Liste des employés (chargée une fois)
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
      .catch(() => {
        // Silencieux : l'utilisateur pourra toujours créer sans bénéficiaire
      })
      .finally(() => {
        if (!cancelled) setEmployeesLoading(false);
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
    const beneficiaire = employees.find(
      (e) => String(e.emp_id) === String(beneficiaireId)
    );

    setLignes([
      ...lignes,
      {
        article: articleCode,
        article_designation: article?.designation || articleCode,
        stock_calcule: article?.stock_calcule ?? 0,
        quantite: Number(quantite),
        // ✅ null = backend attribue au demandeur (d'après le modèle)
        employe_beneficiaire: beneficiaireId || null,
        beneficiaire_nom: beneficiaire?.emp_nom || null,
      },
    ]);

    // Reset du formulaire d'ajout
    setArticleCode("");
    setQuantite("");
    setBeneficiaireId("");
  };

  const retirerLigne = (index) => {
    setLignes(lignes.filter((_, i) => i !== index));
  };

  // Calcul du stock insuffisant global
  const stockInsuffisant = (ligne) =>
    ligne.stock_calcule !== undefined && ligne.quantite > ligne.stock_calcule;

  return (
    <Box>
      {/* ====== TABLEAU DES LIGNES ====== */}
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
            <TableCell align="center" sx={{ width: 110 }}>
              Stock actuel
            </TableCell>
            <TableCell align="center" sx={{ width: 110 }}>
              Quantité
            </TableCell>
            <TableCell sx={{ width: 200 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <PersonIcon fontSize="small" color="action" />
                <span>Bénéficiaire</span>
              </Box>
            </TableCell>
            <TableCell align="center" sx={{ width: 160 }}>
              Statut
            </TableCell>
            <TableCell align="center" sx={{ width: 60 }}>
              {/* Actions */}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lignes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Aucune ligne ajoutée
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            lignes.map((ligne, index) => (
              <TableRow
                key={index}
                sx={{
                  "&:hover": { bgcolor: "#FFFDE7" },
                }}
              >
                {/* Article */}
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {ligne.article}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {ligne.article_designation}
                  </Typography>
                </TableCell>

                {/* Stock actuel */}
                <TableCell align="center">
                  <Typography variant="body2" fontFamily="monospace">
                    {ligne.stock_calcule ?? 0}
                  </Typography>
                </TableCell>

                {/* Quantité */}
                <TableCell align="center">
                  <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                    {ligne.quantite}
                  </Typography>
                </TableCell>

                {/* Bénéficiaire */}
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

                {/* Statut stock */}
                <TableCell align="center">
                  {stockInsuffisant(ligne) ? (
                    <Chip
                      label={`À commander : ${ligne.quantite - ligne.stock_calcule}`}
                      size="small"
                      color="warning"
                      variant="filled"
                    />
                  ) : (
                    <Chip
                      label="Stock suffisant"
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell align="center">
                  <Tooltip title="Retirer la ligne">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => retirerLigne(index)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* ====== FORMULAIRE D'AJOUT ====== */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "2fr 1fr 2fr auto" },
          gap: 1.5,
          p: 2,
          bgcolor: "#FAFAFA",
          borderRadius: 1,
          border: "1px dashed #E0E0E0",
          alignItems: "center",
        }}
      >
        {/* Article */}
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
                {a.code_article} - {a.designation} (stock: {a.stock_calcule ?? 0})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Quantité */}
        <TextField
          label="Quantité"
          type="number"
          size="small"
          value={quantite}
          onChange={(e) => setQuantite(e.target.value)}
          inputProps={{ min: 1, step: 1 }}
          placeholder="0"
        />

        {/* ✅ Bénéficiaire (optionnel) - Autocomplete avec les bons champs */}
        <Autocomplete
          size="small"
          options={employees}
          loading={employeesLoading}
          getOptionLabel={(option) =>
            option?.emp_nom
              ? `${option.emp_nom}${option.emp_matricule ? ` (${option.emp_matricule})` : ""}`
              : ""
          }
          isOptionEqualToValue={(option, value) =>
            String(option?.emp_id) === String(value?.emp_id)
          }
          value={
            employees.find((e) => String(e.emp_id) === String(beneficiaireId)) || null
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
          renderOption={(props, option) => (
            <li {...props} key={option.emp_id}>
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  {option.emp_nom}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.emp_matricule}
                  {option.emp_fonction ? ` • ${option.emp_fonction}` : ""}
                  {option.emp_contact ? ` • ${option.emp_contact}` : ""}
                </Typography>
              </Box>
            </li>
          )}
          noOptionsText="Aucun employé trouvé"
        />

        {/* Bouton Ajouter */}
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
      </Box>

      {/* Info bénéficiaire optionnel */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 1, display: "block", fontStyle: "italic" }}
      >
        💡 Si aucun bénéficiaire n'est spécifié, l'article sera automatiquement attribué au demandeur.
      </Typography>
    </Box>
  );
}