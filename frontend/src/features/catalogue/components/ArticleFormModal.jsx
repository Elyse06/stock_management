import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Divider,
  Autocomplete,
} from "@mui/material";
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Update as UpdateIcon,
  People as PeopleIcon,
} from "@mui/icons-material";
import { apiClient } from "../../../api/client";
import { ArticleFournisseurEditor } from "./ArticleFournisseurEditor";

const MODES_SUIVI = [
  { value: "QUANTITE", label: "Quantité simple" },
  { value: "LOT", label: "Suivi par lot" },
  { value: "NUMERO_SERIE", label: "Suivi par numéro de série" },
];

const EMPTY_FORM = {
  code_article: "",
  code_barre: "",
  designation: "",
  description: "",
  marque: "",
  modele: "",
  unite: "",
  seuil: "",
  mode_suivi: "QUANTITE",
  categorie: "",
};

export function ArticleFormModal({ isOpen, onClose, onSuccess, articleToEdit = null }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [lignesFournisseurs, setLignesFournisseurs] = useState([]);
  const [lignesInitiales, setLignesInitiales] = useState([]);

  const [categories, setCategories] = useState([]);
  const [marques, setMarques] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isEditMode = Boolean(articleToEdit);


  useEffect(() => {
    if (!isOpen) return;

    Promise.all([
      apiClient.get("/api/catalogue/categories/", { params: { page_size: 100 } }),
      apiClient.get("/api/catalogue/marque/", { params: { page_size: 100 } }),
      apiClient.get("/api/catalogue/fournisseurs/", { params: { page_size: 100 } }),
    ])
      .then(([catRes, marqueRes, fourRes]) => {
        setCategories(catRes.data.results ?? catRes.data);
        setMarques(marqueRes.data.results ?? marqueRes.data);
        setFournisseurs(fourRes.data.results ?? fourRes.data);
      })
      .catch(() => setError("Impossible de charger les données de référence."));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (articleToEdit) {
      setForm({
        code_article: articleToEdit.code_article ?? "",
        code_barre: articleToEdit.code_barre ?? "",
        designation: articleToEdit.designation ?? "",
        description: articleToEdit.description ?? "",
        marque: articleToEdit.marque ?? "", // FK → marque_id
        modele: articleToEdit.modele ?? "",
        unite: articleToEdit.unite ?? "",
        seuil: articleToEdit.seuil ?? "",
        mode_suivi: articleToEdit.mode_suivi ?? "QUANTITE",
        categorie: articleToEdit.categorie ?? "",
      });
      const fours = articleToEdit.fournisseurs ?? [];
      setLignesFournisseurs(fours);
      setLignesInitiales(fours);
    } else {
      setForm(EMPTY_FORM);
      setLignesFournisseurs([]);
      setLignesInitiales([]);
    }
    setError("");
  }, [isOpen, articleToEdit]);


  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setLignesFournisseurs([]);
    setLignesInitiales([]);
    setError("");
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
    setError("");

    try {
      const payload = {
        ...form,
        categorie: Number(form.categorie),
        marque: Number(form.marque),
        seuil: form.seuil === "" ? 0 : Number(form.seuil),
      };

      if (isEditMode) {
        await apiClient.put(`/api/catalogue/articles/${articleToEdit.code_article}/`, payload);
        await synchroniserFournisseurs(articleToEdit.code_article);
      } else {
        await apiClient.post("/api/catalogue/articles/", payload);
        for (const l of lignesFournisseurs) {
          await apiClient.post("/api/catalogue/article-fournisseurs/", {
            article: form.code_article,
            fournisseur: l.fournisseur,
            prix_achat: l.prix_achat,
          });
        }
      }

      if (onSuccess) onSuccess();
      handleClose();
    } catch (err) {
      const detail = err?.response?.data;
      if (detail && typeof detail === "object") {
        setError(
          Object.entries(detail)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ")
        );
      } else {
        setError("Erreur lors de l'enregistrement de l'article.");
      }
    } finally {
      setSaving(false);
    }
  };


  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: "#FFF8E1",
            borderBottom: "2px solid",
            borderColor: "primary.main",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                bgcolor: isEditMode ? "primary.main" : "success.main",
                color: "white",
                borderRadius: 1,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {isEditMode ? "ÉDITION" : "CRÉATION"}
            </Box>
            <Typography variant="h3">
              {isEditMode ? "Modifier l'article" : "Nouvel article"}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          {error && (
            <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="Code article"
              value={form.code_article}
              onChange={handleChange("code_article")}
              required
              disabled={isEditMode}
              placeholder="ART-XXX"
              inputProps={{ maxLength: 20 }}
            />

            <TextField
              label="Code-barre"
              value={form.code_barre}
              onChange={handleChange("code_barre")}
              placeholder="Scannez ou saisissez..."
              inputProps={{ maxLength: 100 }}
            />

            <TextField
              label="Désignation"
              value={form.designation}
              onChange={handleChange("designation")}
              required
              inputProps={{ maxLength: 50 }}
            />

            <FormControl required>
              <InputLabel>Catégorie</InputLabel>
              <Select
                value={form.categorie}
                label="Catégorie"
                onChange={handleChange("categorie")}
              >
                <MenuItem value="" disabled>
                  Choisir une catégorie...
                </MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.categorie_id} value={c.categorie_id}>
                    {c.cat_libelle}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <Autocomplete
                options={marques}
                getOptionLabel={(option) => option.mq_libelle || ""}
                value={marques.find((m) => m.marque_id === form.marque) || null}
                onChange={(event, newValue) => {
                  const value = newValue ? newValue.marque_id : "";
                  handleChange("marque")({ target: { value } });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Marque"
                    placeholder="Choisir ou rechercher une marque..."
                  />
                )}
                isOptionEqualToValue={(option, value) => option.marque_id === value.marque_id}
              />
            </FormControl>

            <TextField
              label="Modèle"
              value={form.modele}
              onChange={handleChange("modele")}
              inputProps={{ maxLength: 30 }}
            />

            <TextField
              label="Unité"
              value={form.unite}
              onChange={handleChange("unite")}
              placeholder="unité, kg, boîte..."
              inputProps={{ maxLength: 20 }}
            />

            <TextField
              label="Seuil de réapprovisionnement"
              type="number"
              value={form.seuil}
              onChange={handleChange("seuil")}
              placeholder="0"
              inputProps={{ min: 0, max: 2147483647 }}
            />

            <FormControl>
              <InputLabel>Mode de suivi</InputLabel>
              <Select
                value={form.mode_suivi}
                label="Mode de suivi"
                onChange={handleChange("mode_suivi")}
              >
                {MODES_SUIVI.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Description"
              value={form.description}
              onChange={handleChange("description")}
              multiline
              rows={3}
              sx={{ gridColumn: { sm: "1 / -1" } }}
            />
          </Box>

          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
                <PeopleIcon fontSize="small" />
                <Typography variant="body2" fontWeight={600}>
                  Fournisseurs et prix d'achat
                </Typography>
              </Box>
            </Divider>

            <ArticleFournisseurEditor
              lignes={lignesFournisseurs}
              setLignes={setLignesFournisseurs}
              fournisseurs={fournisseurs}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={saving}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={
              saving ? (
                <CircularProgress size={16} color="inherit" />
              ) : isEditMode ? (
                <UpdateIcon />
              ) : (
                <SaveIcon />
              )
            }
          >
            {saving
              ? "Enregistrement..."
              : isEditMode
              ? "Mettre à jour"
              : "Enregistrer"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}