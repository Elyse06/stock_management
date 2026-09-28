import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { THEME, primaryButtonSx } from "./theme";
import { ACTION_CATEGORIES } from "./permissions";

const MAX_ID_LENGTH = 8;

const ACTION_SUFFIXES = [
  { value: "LIRE", label: "LIRE : consultation" },
  { value: "GERE", label: "GERE : gestion (créer, modifier)" },
  { value: "VAL", label: "VAL : validation" },
  { value: "DEM", label: "DEM : demande" },
  { value: "SUPP", label: "SUPP : suppression" },
  { value: "CUSTOM", label: "Autre (saisie libre)" },
];

export function ActionFormDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
  serverError = "",
  existingActionIds = [],
}) {
  const [category, setCategory] = useState("CAT");
  const [suffix, setSuffix] = useState("LIRE");
  const [customSuffix, setCustomSuffix] = useState("");
  const [libelle, setLibelle] = useState("");
  const [description, setDescription] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setCategory("CAT");
      setSuffix("LIRE");
      setCustomSuffix("");
      setLibelle("");
      setDescription("");
      setTouched(false);
    }
  }, [open]);

  const prefix = ACTION_CATEGORIES.find((c) => c.key === category)?.prefix || "";
  const finalSuffix = suffix === "CUSTOM" ? customSuffix.trim().toUpperCase() : suffix;
  const actionId = finalSuffix ? `${prefix}${finalSuffix}` : "";

  const errors = {};
  if (suffix === "CUSTOM" && !finalSuffix) errors.suffix = "Saisissez un suffixe.";
  else if (suffix === "CUSTOM" && !/^[A-Z0-9]+$/.test(finalSuffix))
    errors.suffix = "Lettres et chiffres uniquement.";
  else if (actionId.length > MAX_ID_LENGTH)
    errors.suffix = `Identifiant trop long (${MAX_ID_LENGTH} caractères maximum).`;
  else if (existingActionIds.includes(actionId))
    errors.suffix = `L'action ${actionId} existe déjà.`;
  if (!libelle.trim()) errors.libelle = "Le libellé est obligatoire.";
  if (!description.trim()) errors.description = "La description est obligatoire.";

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length > 0) return;
    onSubmit({
      action_id: actionId,
      action_libelle: libelle.trim(),
      action_description: description.trim(),
    });
  };

  const show = (field) => (touched ? errors[field] : undefined);

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ component: "form", onSubmit: handleSubmit, noValidate: true }}
    >
      <DialogTitle sx={{ borderBottom: `1px solid ${THEME.gray200}` }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <AddIcon sx={{ color: THEME.primary, fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Nouvelle permission
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Elle sera automatiquement accordée aux administrateurs.
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        <Box
          sx={{
            p: 1.5,
            mb: 2.5,
            bgcolor: THEME.primaryVeryLight,
            border: `1px solid ${THEME.primaryBorder}`,
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Typography variant="body2" sx={{ color: THEME.gray700 }}>
            Identifiant généré
          </Typography>
          <Chip
            label={actionId || "—"}
            size="small"
            sx={{
              fontFamily: "monospace",
              fontWeight: 700,
              bgcolor: THEME.white,
              color: THEME.textStrong,
              border: `1px solid ${THEME.primaryBorder}`,
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
            {actionId.length}/{MAX_ID_LENGTH}
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="cat-label">Catégorie</InputLabel>
              <Select
                labelId="cat-label"
                value={category}
                label="Catégorie"
                onChange={(e) => setCategory(e.target.value)}
              >
                {ACTION_CATEGORIES.map((c) => (
                  <MenuItem key={c.key} value={c.key}>
                    {c.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" error={Boolean(show("suffix")) && suffix !== "CUSTOM"}>
              <InputLabel id="suffix-label">Type d'action</InputLabel>
              <Select
                labelId="suffix-label"
                value={suffix}
                label="Type d'action"
                onChange={(e) => setSuffix(e.target.value)}
              >
                {ACTION_SUFFIXES.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
              {suffix !== "CUSTOM" && show("suffix") && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  {show("suffix")}
                </Typography>
              )}
            </FormControl>
          </Grid>

          {suffix === "CUSTOM" && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Suffixe (4 caractères maximum)"
                placeholder="ex : IMP, EXP, ARC"
                value={customSuffix}
                onChange={(e) => setCustomSuffix(e.target.value.toUpperCase())}
                error={Boolean(show("suffix"))}
                helperText={show("suffix") || `Ajouté au préfixe : ${prefix}…`}
                inputProps={{ maxLength: 4 }}
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Libellé"
              placeholder="ex : Export Excel"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              error={Boolean(show("libelle"))}
              helperText={show("libelle") || `${libelle.length}/50`}
              inputProps={{ maxLength: 50 }}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              minRows={3}
              size="small"
              label="Description"
              placeholder="Ce que cette permission autorise concrètement…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              error={Boolean(show("description"))}
              helperText={show("description")}
              required
            />
          </Grid>

          {serverError && (
            <Grid item xs={12}>
              <Alert severity="error">{serverError}</Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting} sx={{ textTransform: "none" }}>
          Annuler
        </Button>
        <Button type="submit" variant="contained" disabled={isSubmitting} sx={primaryButtonSx}>
          {isSubmitting ? "Création…" : "Créer la permission"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}