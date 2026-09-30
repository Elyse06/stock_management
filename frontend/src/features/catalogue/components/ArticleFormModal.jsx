import { useEffect, useState, useRef } from "react";
import {
  TextField, Box,
  Tooltip, IconButton,
  FormControlLabel, Checkbox, Typography,
} from "@mui/material";
import {
  Save as SaveIcon, Update as UpdateIcon,
  AutoFixHigh as AutoFixIcon,
} from "@mui/icons-material";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../../constants/api";
import { usePermission } from "../../../hooks/usePermission";
import { useNotification } from "../../../components/common/NotificationProvider";
import { FormDialog } from "../../../components/common/FormDialog";
import { SelectFilter } from "../../../components/common/SelectFilter";

const MODES_SUIVI = [
  { value: "QUANTITE", label: "Quantité simple" },
  { value: "NUMERO_SERIE", label: "Suivi par numéro de série" },
];

const UNITE = [
  { value: "UNITE", label: "Unité" },
  { value: "BOITE", label: "Boite" },
  { value: "Carton", label: "Carton" },
  { value: "Litre", label: "Litre" },
  { value: "Paquet", label: "Paquet" },
];

const EMPTY_FORM = {
  code_article: "",
  code_barre: "",
  designation: "",
  description: "",
  modele: "",
  unite: "UNITE",
  seuil: "0",
  mode_suivi: "QUANTITE",
  categorie: "",
  is_immobilisation: false,
};

export function ArticleFormModal({ isOpen, onClose, onSuccess, articleToEdit = null }) {
  const notify = useNotification();
  const { canManageCatalogue } = usePermission();

  const [form, setForm] = useState(EMPTY_FORM);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);

  const designationRef = useRef(null);
  const seuilRef = useRef(null);
  const isEditMode = Boolean(articleToEdit);

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      apiClient.get(API_ENDPOINTS.CATEGORIES, { params: { page_size: 100 } }),
    ])
      .then(([catRes]) => {
        setCategories(catRes.data.results ?? catRes.data);
      })
      .catch(() => notify.error(ERROR_MESSAGES.LOAD_FAILED));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (articleToEdit) {
      setForm({
        code_article: articleToEdit.code_article ?? "",
        code_barre: articleToEdit.code_barre ?? "",
        designation: articleToEdit.designation ?? "",
        description: articleToEdit.description ?? "",
        modele: articleToEdit.modele ?? "",
        unite: articleToEdit.unite ?? "UNITE",
        seuil: articleToEdit.seuil ?? "0",
        mode_suivi: articleToEdit.mode_suivi ?? "QUANTITE",
        categorie: articleToEdit.categorie ?? "",
        is_immobilisation: articleToEdit.is_immobilisation ?? true,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [isOpen, articleToEdit]);

  const handleChange = (field) => (e) => {
    const value = e?.target
      ? e.target.value
      : e;
    setForm((prev) => ({ ...prev, [field]: value }));

    if (field === "categorie" && !isEditMode && value) {
      const cat = categories.find((c) => c.categorie_id === Number(value));
      if (cat) {
        const prefix = cat.cat_libelle.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "");
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        setForm((prev) => ({ ...prev, code_article: `${prefix}-${randomSuffix}` }));
      }
    }
  };

  const handleGenerateCode = () => {
    const cat = categories.find((c) => c.categorie_id === Number(form.categorie));
    const prefix = cat ? cat.cat_libelle.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "") : "ART";
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setForm((prev) => ({ ...prev, code_article: `${prefix}-${randomSuffix}` }));
  };


  const handleClose = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        categorie: Number(form.categorie),
        seuil: form.seuil === "" ? 0 : Number(form.seuil),
      };

      if (isEditMode) {
        await apiClient.put(`${API_ENDPOINTS.ARTICLES}${articleToEdit.code_article}/`, payload);
        notify.success("Article modifié avec succès");
      } else {
        await apiClient.post(API_ENDPOINTS.ARTICLES, payload);
        notify.success("Article créé avec succès");
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

  const categorieOptions = [
    { value: "", label: "Choisir une catégorie..." },
    ...categories.map((c) => ({ value: c.categorie_id, label: `${c.cat_libelle} - ${c.cat_description}` })),
  ];

  const uniteOptions = UNITE.map((u) => ({ value: u.value, label: u.label }));

  return (
    <FormDialog
      open={isOpen}
      onClose={handleClose}
      title={isEditMode ? "Modifier l'article" : "Nouvel article"}
      onSubmit={handleSubmit}
      saving={saving}
      submitLabel={isEditMode ? "Mettre à jour" : "Enregistrer"}
      submitIcon={isEditMode ? <UpdateIcon /> : <SaveIcon />}
      disabled={!canManageCatalogue}
      maxWidth="md"
      headerBadge={isEditMode ? "ÉDITION" : "CRÉATION RAPIDE"}
      headerBadgeColor={isEditMode ? "primary.main" : "success.main"}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>

        <SelectFilter
          label="Catégorie"
          value={form.categorie}
          onChange={handleChange("categorie")}
          options={categorieOptions}
          required
        />

        <Box sx={{ position: "relative" }}>
          <TextField
            id="code-article"
            label="Code article"
            value={form.code_article}
            onChange={handleChange("code_article")}
            required
            disabled={isEditMode}
            inputProps={{ maxLength: 20 }}
            fullWidth
          />
          {!isEditMode && (
            <Tooltip>
              <IconButton
                size="small"
                onClick={handleGenerateCode}
                sx={{ position: "absolute", right: 8, top: 12, color: "primary.main" }}
              >
                <AutoFixIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/** Pas encore utilisé
        <TextField
          id="code-barre"
          label="Code-barre"
          value={form.code_barre}
          onChange={handleChange("code_barre")}
          onKeyDown={handleBarcodeKeyDown}
          placeholder="Scanner ou saisir..."
          inputProps={{ maxLength: 100 }}
          fullWidth
          InputProps={{
            startAdornment: <QrCodeScannerIcon fontSize="small" sx={{ color: "text.secondary", mr: 1 }} />,
          }}
        />
        */}

        <TextField
          id="designation"
          inputRef={designationRef}
          label="Désignation"
          value={form.designation}
          onChange={handleChange("designation")}
          required
          inputProps={{ maxLength: 50 }}
          fullWidth
        />

        {/** Unitilisable mais possible amelioration
        <Autocomplete
          options={marques}
          getOptionLabel={(option) => option.mq_libelle || ""}
          value={marques.find((m) => m.marque_id === form.marque) || null}
          onChange={(event, newValue) => {
            const value = newValue ? newValue.marque_id : "";
            handleChange("marque")({ target: { value } });
          }}
          renderInput={(params) => (
            <TextField {...params} label="Marque" placeholder="Choisir ou rechercher..." />
          )}
          isOptionEqualToValue={(option, value) => option.marque_id === value.marque_id}
        />
        */}

        <TextField
          label="Modèle"
          value={form.modele}
          onChange={handleChange("modele")}
          inputProps={{ maxLength: 30 }}
          fullWidth
        />

        <TextField
          id="seuil"
          inputRef={seuilRef}
          label="Seuil de réapprovisionnement"
          type="number"
          value={form.seuil}
          onChange={handleChange("seuil")}
          placeholder="0"
          inputProps={{ min: 0, max: 2147483647 }}
          fullWidth
        />

        <SelectFilter
          label="Unité"
          value={form.unite}
          onChange={handleChange("unite")}
          options={uniteOptions}
        />

        {/** On laisse juste tous les articles en quantite simple maintenant,
         * possible evolution
        <SelectFilter
          label="Mode de suivi"
          value={form.mode_suivi}
          onChange={handleChange("mode_suivi")}
          options={modeSuiviOptions}
        />
        */}

        <TextField
          label="Description"
          value={form.description}
          onChange={handleChange("description")}
          multiline
          rows={3}
          sx={{ gridColumn: { sm: "1 / -1" } }}
          fullWidth
        />
      </Box>
      <Box sx={{ gridColumn: { sm: "1 / -1" }, mt: 2, p: 2, bgcolor: "#FFF8E1", borderRadius: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={form.is_immobilisation}
              onChange={(e) => setForm((prev) => ({ ...prev, is_immobilisation: e.target.checked }))}
              color="primary"
            />
          }
          label={
            <Box>
              <Typography variant="body2" fontWeight={600}>
                Article immobilisation
              </Typography>
            </Box>
          }
        />
      </Box>
    </FormDialog>
  );
}