import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Checkbox, FormControlLabel, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import { AutoFixHigh as AutoFixIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import { FormDialog } from "@/components/forms/FormDialog";
import { SelectFilter } from "@/components/forms/SelectFilter";
import { libelleCategorie } from "@/constants/articles";
import { useCrudMutations } from "@/hooks/useCrudMutations";

import { articlesApi } from "../api/catalogueApi";
import { genererCodeArticle, UNITES } from "../constants/article";
import { useCategoryOptions } from "../hooks/useCategoryOptions";

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

const toForm = (article) =>
  Object.fromEntries(Object.entries(EMPTY_FORM).map(([k, defaut]) => [k, article[k] ?? defaut]));

/**
 * Création / modification d'un article. ``articleCode`` absent = création ; ``valeursInitiales``
 * pré-remplit une création (ex. depuis une demande de nouvel article) et ``onCree`` reçoit l'article créé.
 */
export function ArticleFormModal({ isOpen, onClose, articleCode = null, valeursInitiales = null, onCree }) {
  const isEdit = Boolean(articleCode);
  const [form, setForm] = useState(EMPTY_FORM);
  const initiales = useRef(valeursInitiales);
  initiales.current = valeursInitiales;
  const { data: categories = [] } = useCategoryOptions();
  const { save, saving } = useCrudMutations(articlesApi, [["articles"], ["article"], ["options", "articles"]], {
    created: "Article créé avec succès",
    updated: "Article modifié avec succès",
  });

  // Détail complet de l'article (la liste ne contient pas tous les champs).
  const { data: article } = useQuery({
    queryKey: ["articles", "detail", articleCode],
    queryFn: ({ signal }) => articlesApi.get(articleCode, { signal }),
    enabled: isOpen && isEdit,
  });

  useEffect(() => {
    if (!isOpen) return;
    setForm(isEdit ? (article ? toForm(article) : EMPTY_FORM) : { ...EMPTY_FORM, ...initiales.current });
  }, [isOpen, isEdit, article]);

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
  const categorieDe = (id) => categories.find((c) => c.categorie_id === Number(id));

  const changerCategorie = (value) => {
    setForm((prev) => ({
      ...prev,
      categorie: value,
      code_article: !isEdit && value ? genererCodeArticle(categorieDe(value)) : prev.code_article,
    }));
  };

  const categorieOptions = useMemo(
    () => [
      { value: "", label: "Choisir une catégorie..." },
      ...categories.map((c) => ({ value: c.categorie_id, label: libelleCategorie(c.cat_libelle, c.cat_description) })),
    ],
    [categories],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      designation: form.designation.trim(),
      code_article: form.code_article.trim(),
      categorie: Number(form.categorie),
      seuil: form.seuil === "" ? 0 : Number(form.seuil),
    };
    const resultat = await save(isEdit ? articleCode : null, payload);
    if (!resultat) return;
    if (!isEdit && typeof resultat === "object") onCree?.(resultat);
    onClose();
  };

  const valide = form.categorie && form.code_article.trim() && form.designation.trim();

  return (
    <FormDialog
      open={isOpen}
      onClose={onClose}
      title={isEdit ? "Modifier l'article" : "Nouvel article"}
      onSubmit={handleSubmit}
      saving={saving}
      submitLabel={isEdit ? "Mettre à jour" : "Enregistrer"}
      disabled={!valide || (isEdit && !article)}
      maxWidth="md"
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mt: 1 }}>
        <SelectFilter label="Catégorie" value={form.categorie} onChange={changerCategorie} options={categorieOptions} required />
        <Box sx={{ position: "relative" }}>
          <TextField
            label="Code article"
            value={form.code_article}
            onChange={(e) => setField("code_article", e.target.value)}
            required
            disabled={isEdit}
            slotProps={{ htmlInput: { maxLength: 20 } }}
            fullWidth
          />
          {!isEdit && (
            <Tooltip title="Générer un code">
              <IconButton
                size="small"
                aria-label="Générer un code"
                onClick={() => setField("code_article", genererCodeArticle(categorieDe(form.categorie)))}
                sx={{ position: "absolute", right: 8, top: 12, color: "primary.main" }}
              >
                <AutoFixIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <TextField
          label="Désignation"
          value={form.designation}
          onChange={(e) => setField("designation", e.target.value)}
          required
          slotProps={{ htmlInput: { maxLength: 50 } }}
          fullWidth
        />
        <TextField
          label="Modèle"
          value={form.modele}
          onChange={(e) => setField("modele", e.target.value)}
          slotProps={{ htmlInput: { maxLength: 30 } }}
          fullWidth
        />
        <TextField
          label="Seuil de réapprovisionnement"
          type="number"
          value={form.seuil}
          onChange={(e) => setField("seuil", e.target.value)}
          slotProps={{ htmlInput: { min: 0, max: 2147483647 } }}
          fullWidth
        />
        <SelectFilter label="Unité" value={form.unite} onChange={(v) => setField("unite", v)} options={UNITES} />
        <TextField
          label="Description"
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          multiline
          rows={3}
          sx={{ gridColumn: { sm: "1 / -1" } }}
          fullWidth
        />
      </Box>
      <Box sx={{ mt: 2, p: 2, bgcolor: "tint.main", borderRadius: 1 }}>
        <FormControlLabel
          control={
            <Checkbox checked={form.is_immobilisation} onChange={(e) => setField("is_immobilisation", e.target.checked)} />
          }
          label={
            <Typography variant="body2" fontWeight={600}>
              Article immobilisation
            </Typography>
          }
        />
      </Box>
    </FormDialog>
  );
}
