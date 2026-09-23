import { useEffect, useState, useRef } from "react";
import {
  TextField, Autocomplete, Box,
  Divider, Tooltip, IconButton,
  FormControlLabel, Checkbox, Typography,
} from "@mui/material";
import {
  Save as SaveIcon, Update as UpdateIcon,
  People as PeopleIcon, AutoFixHigh as AutoFixIcon,
  QrCodeScanner as QrCodeScannerIcon,
} from "@mui/icons-material";
import { apiClient } from "../../../api/client";
import { API_ENDPOINTS, ERROR_MESSAGES } from "../../../constants/api";
import { usePermission } from "../../../hooks/usePermission";
import { useNotification } from "../../../components/common/NotificationProvider";
import { FormDialog } from "../../../components/common/FormDialog";
import { SelectFilter } from "../../../components/common/SelectFilter";
import { ArticleFournisseurEditor } from "./ArticleFournisseurEditor";

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
  marque: "",
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
  const [lignesFournisseurs, setLignesFournisseurs] = useState([]);
  const [lignesInitiales, setLignesInitiales] = useState([]);
  const [categories, setCategories] = useState([]);
  const [marques, setMarques] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [saving, setSaving] = useState(false);

  const designationRef = useRef(null);
  const seuilRef = useRef(null);
  const isEditMode = Boolean(articleToEdit);

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      apiClient.get(API_ENDPOINTS.CATEGORIES, { params: { page_size: 100 } }),
      apiClient.get(API_ENDPOINTS.MARQUES, { params: { page_size: 100 } }),
      apiClient.get(API_ENDPOINTS.FOURNISSEURS, { params: { page_size: 100 } }),
    ])
      .then(([catRes, marqueRes, fourRes]) => {
        setCategories(catRes.data.results ?? catRes.data);
        setMarques(marqueRes.data.results ?? marqueRes.data);
        setFournisseurs(fourRes.data.results ?? fourRes.data);
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
        marque: articleToEdit.marque ?? "",
        modele: articleToEdit.modele ?? "",
        unite: articleToEdit.unite ?? "UNITE",
        seuil: articleToEdit.seuil ?? "0",
        mode_suivi: articleToEdit.mode_suivi ?? "QUANTITE",
        categorie: articleToEdit.categorie ?? "",
        is_immobilisation: articleToEdit.is_immobilisation ?? true,
      });
      const fours = articleToEdit.fournisseurs ?? [];
      setLignesFournisseurs(fours);
      setLignesInitiales(fours);
    } else {
      setForm(EMPTY_FORM);
      setLignesFournisseurs([]);
      setLignesInitiales([]);
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

  const handleBarcodeKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (designationRef.current) {
        designationRef.current.focus();
      }
    }
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setLignesFournisseurs([]);
    setLignesInitiales([]);
    onClose();
  };

  const synchroniserFournisseurs = async (codeArticle) => {
    const idsInitiaux = new Set(lignesInitiales.filter((l) => l.id).map((l) => l.id));
    const idsActuels = new Set(lignesFournisseurs.filter((l) => l.id).map((l) => l.id));

    for (const l of lignesInitiales) {
      if (l.id && !idsActuels.has(l.id)) {
        await apiClient.delete(`/api/catalogue/article-fournisseurs/${l.id}/`);
      }
    }
    for (const l of lignesFournisseurs) {
      if (l.id && idsInitiaux.has(l.id)) {
        await apiClient.put(`/api/catalogue/article-fournisseurs/${l.id}/`, {
          article: codeArticle,
          fournisseur: l.fournisseur,
          prix_achat: l.prix_achat,
        });
      } else if (!l.id) {
        await apiClient.post("/api/catalogue/article-fournisseurs/", {
          article: codeArticle,
          fournisseur: l.fournisseur,
          prix_achat: l.prix_achat,
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        categorie: Number(form.categorie),
        marque: form.marque ? Number(form.marque) : null,
        seuil: form.seuil === "" ? 0 : Number(form.seuil),
      };

      if (isEditMode) {
        await apiClient.put(`${API_ENDPOINTS.ARTICLES}${articleToEdit.code_article}/`, payload);
        await synchroniserFournisseurs(articleToEdit.code_article);
        notify.success("Article modifié avec succès");
      } else {
        const { data } = await apiClient.post(API_ENDPOINTS.ARTICLES, payload);
        for (const l of lignesFournisseurs) {
          await apiClient.post("/api/catalogue/article-fournisseurs/", {
            article: data.code_article,
            fournisseur: l.fournisseur,
            prix_achat: l.prix_achat,
          });
        }
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

  const modeSuiviOptions = MODES_SUIVI.map((m) => ({ value: m.value, label: m.label }));
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

      {/** on specifie le fournisseur et le prix d'achat quand on fait l'entrée du stock 
      <Box sx={{ mt: 3 }}>
        <Divider sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
            <PeopleIcon fontSize="small" />
            <Box variant="body2" fontWeight={600}>Fournisseurs et prix d'achat</Box>
          </Box>
        </Divider>
        <ArticleFournisseurEditor
          lignes={lignesFournisseurs}
          setLignes={setLignesFournisseurs}
          fournisseurs={fournisseurs}
        />
      </Box>
      */}
    </FormDialog>
  );
}