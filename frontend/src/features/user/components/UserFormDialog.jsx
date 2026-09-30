import { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Autocomplete, Box,
  Typography, Checkbox, Card, CardContent, Chip, InputAdornment, IconButton, Tooltip, CircularProgress,
  Alert,
} from "@mui/material";
import {
  Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon, Autorenew as GenerateIcon, Security as SecurityIcon,
  Badge as BadgeIcon, Email as EmailIcon, CheckCircle as CheckCircleIcon, Person as PersonIcon,
} from "@mui/icons-material";
import { THEME, primaryButtonSx, codeChipSx } from "./theme";
import { buildPermissionGroups, resolveRoles, detectRoleId } from "./permissions";
import { useActions } from "./useActions.js";

const MIN_PASSWORD_LENGTH = 8;
const STANDARD_ACTIONS = ["CAT_LIRE", "MOV_LIRE", "COM_DEM"];

const generatePassword = (length = 12) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => chars[v % chars.length]).join("");
};

export function UserFormDialog({ open, onClose, onSubmit, isSubmitting = false, initialData = null, employees = [] }) {
  const isEdit = Boolean(initialData);
  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedActions, setSelectedActions] = useState(STANDARD_ACTIONS);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const { data: apiActions = [], isLoading: actionsLoading, error: actionsError } = useActions();
  const permissionGroups = useMemo(() => buildPermissionGroups(apiActions), [apiActions]);
  const allPermissionIds = useMemo(() => apiActions.map((a) => a.action_id), [apiActions]);
  const presetRoles = useMemo(() => resolveRoles(allPermissionIds), [allPermissionIds]);
  const selectableRoles = presetRoles.filter((r) => r.id !== "CUSTOM");
  const selectedAvailableActions = useMemo(
    () => selectedActions.filter((id) => allPermissionIds.includes(id)),
    [selectedActions, allPermissionIds]
  );
  const roleId = detectRoleId(selectedAvailableActions, presetRoles);

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setMail(initialData.utilisateur_mail || "");
      setSelectedActions(initialData.actions || []);
      setSelectedEmpId(initialData.emp_id || "");
    } else {
      setMail("");
      setSelectedActions(STANDARD_ACTIONS);
      setSelectedEmpId("");
    }
    setPassword("");
    setShowPassword(false);
    setErrors({});
    setSubmitAttempted(false);
  }, [open, initialData]);

  const clearError = (field) => errors[field] && setErrors((prev) => ({ ...prev, [field]: null }));

  const applyPreset = (preset) => setSelectedActions([...preset.actions]);
  const toggleAction = (id) =>
    setSelectedActions((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  const toggleGroup = (group) => {
    const ids = group.items.map((i) => i.id);
    const allOn = ids.every((id) => selectedActions.includes(id));
    setSelectedActions((prev) => (allOn ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]));
    clearError("actions");
  };

  const handleGeneratePassword = () => {
    setPassword(generatePassword());
    setShowPassword(true);
    clearError("password");
  };

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.emp_id === selectedEmpId) || null,
    [selectedEmpId, employees]
  );

  const isAssignedToAnother = (employee) => {
    const assignedUserId = employee.emp_utilisateur_id;
    return Boolean(assignedUserId && (!initialData || String(assignedUserId) !== String(initialData.utilisateur_id)));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!mail.trim()) {
      newErrors.mail = "L'adresse email est obligatoire.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.trim())) {
      newErrors.mail = "Adresse email invalide.";
    }
    
    if (!isEdit && !password.trim()) {
      newErrors.password = "Le mot de passe est obligatoire.";
    } else if (password && password.length < MIN_PASSWORD_LENGTH) {
      newErrors.password = `Au moins ${MIN_PASSWORD_LENGTH} caractères.`;
    }
    
    if (selectedAvailableActions.length === 0) {
      newErrors.actions = "Accordez au moins une permission.";
    }
    
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    const payload = {
      utilisateur_mail: mail.trim().toLowerCase(),
      actions: selectedAvailableActions,
      emp_id: selectedEmpId || null,
    };
    if (password) payload.utilisateur_mdp = password;
    onSubmit(payload);
  };

  const isFormDisabled = isSubmitting || actionsLoading;

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          component: "form",
          onSubmit: handleSubmit,
          noValidate: true,
        },
      }}
    >
      <DialogTitle sx={{ borderBottom: `1px solid ${THEME.gray200}` }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <SecurityIcon sx={{ color: THEME.primary, fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {isEdit ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isEdit
                ? "Mettez à jour l'accès, l'employé rattaché et les permissions."
                : "Créez un compte et choisissez un profil adapté au poste."}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {actionsError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Impossible de charger les permissions. Vérifiez votre connexion.
          </Alert>
        )}
        
        {actionsLoading && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Chargement des permissions en cours...
          </Alert>
        )}

        {submitAttempted && Object.keys(errors).length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Veuillez corriger les erreurs ci-dessous avant de soumettre.
          </Alert>
        )}

        {/* Identifiants */}
        <SectionTitle icon={<EmailIcon fontSize="small" sx={{ color: THEME.primary }} />} title="Identifiants" />
        {/* 🔧 Remplacement de Grid par Box avec CSS Grid */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "7fr 5fr" }, gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            size="small"
            type="email"
            label="Adresse email"
            placeholder="prenom.nom@paositra.mg"
            value={mail}
            onChange={(e) => {
              setMail(e.target.value);
              clearError("mail");
            }}
            error={Boolean(errors.mail)}
            helperText={errors.mail || "Sert d'identifiant de connexion"}
            autoFocus
            required
            disabled={isFormDisabled}
          />
          <TextField
            fullWidth
            size="small"
            label={isEdit ? "Nouveau mot de passe" : "Mot de passe"}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearError("password");
            }}
            error={Boolean(errors.password)}
            helperText={errors.password || (isEdit ? "Laissez vide pour le conserver" : `${MIN_PASSWORD_LENGTH} caractères minimum`)}
            required={!isEdit}
            autoComplete="new-password"
            disabled={isFormDisabled}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Générer un mot de passe">
                      <IconButton size="small" onClick={handleGeneratePassword} disabled={isFormDisabled}>
                        <GenerateIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={() => setShowPassword((v) => !v)}>
                      {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        {/* Employé rattaché */}
        <SectionTitle icon={<BadgeIcon fontSize="small" sx={{ color: THEME.primary }} />} title="Employé rattaché" optional />
        <Box sx={{ mb: 3 }}>
          <Autocomplete
            value={selectedEmployee}
            onChange={(_, value) => setSelectedEmpId(value ? value.emp_id : "")}
            options={employees}
            isOptionEqualToValue={(o, v) => o.emp_id === v.emp_id}
            getOptionLabel={(o) => (o ? `${o.emp_nom} (${o.emp_matricule})` : "")}
            getOptionDisabled={isAssignedToAnother}
            disabled={isFormDisabled}
            renderOption={(props, option) => {
              const { key, ...rest } = props;
              const disabled = isAssignedToAnother(option);
              return (
                <Box component="li" key={key} {...rest} sx={{ opacity: disabled ? 0.5 : 1 }}>
                  <PersonIcon fontSize="small" sx={{ color: THEME.gray700, mr: 1 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{option.emp_nom}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.emp_matricule} · {option.emp_fonction || "Fonction non renseignée"}
                      {disabled && " · Déjà lié à un autre compte"}
                    </Typography>
                  </Box>
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Employé"
                placeholder="Rechercher par nom ou matricule"
                helperText="Permet de pré-remplir ses demandes internes"
              />
            )}
            noOptionsText="Aucun employé trouvé"
            clearText="Effacer"
          />
          {selectedEmployee && (
            <Box sx={{ mt: 1.5, p: 1.5, bgcolor: THEME.primaryVeryLight, borderRadius: 1, border: `1px solid ${THEME.primaryBorder}`, display: "flex", flexWrap: "wrap", gap: 3 }}>
              <Info label="Fonction" value={selectedEmployee.emp_fonction} />
              <Info label="Direction" value={selectedEmployee.direction_libelle} />
              <Info label="Service" value={selectedEmployee.service_libelle} />
              <Info label="Contact" value={selectedEmployee.emp_contact} />
            </Box>
          )}
        </Box>

        {/* Profil d'accès */}
        <SectionTitle icon={<SecurityIcon fontSize="small" sx={{ color: THEME.primary }} />} title="Profil d'accès" />
        {/* 🔧 Remplacement de Grid par Box avec CSS Grid */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, gap: 1.5, mb: 1 }}>
          {selectableRoles.map((preset) => {
            const isSelected = roleId === preset.id;
            return (
              <Card
                key={preset.id}
                variant="outlined"
                onClick={() => !isFormDisabled && applyPreset(preset)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), !isFormDisabled && applyPreset(preset))}
                sx={{
                  cursor: isFormDisabled ? "not-allowed" : "pointer",
                  height: "100%",
                  borderColor: isSelected ? THEME.primary : THEME.gray200,
                  bgcolor: isSelected ? THEME.primarySoft : THEME.white,
                  opacity: isFormDisabled ? 0.6 : 1,
                  "&:hover": { borderColor: isFormDisabled ? THEME.gray200 : THEME.primary },
                }}
              >
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
                      {preset.label}
                    </Typography>
                    {isSelected && <CheckCircleIcon sx={{ color: THEME.primaryDark, fontSize: 18 }} />}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.25 }}>
                    {preset.description}
                  </Typography>
                </CardContent>
              </Card>
            );
          })}
        </Box>
        {roleId === "CUSTOM" && (
          <Typography variant="caption" sx={{ color: THEME.textStrong, fontWeight: 600 }}>
            Profil personnalisé : les permissions ne correspondent à aucun modèle.
          </Typography>
        )}

        {/* Permissions */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 3, mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Permissions</Typography>
          <Chip
            size="small"
            label={`${selectedAvailableActions.length} sur ${allPermissionIds.length}`}
            sx={{ fontWeight: 600, bgcolor: THEME.primaryVeryLight, color: THEME.textStrong, border: `1px solid ${THEME.primaryBorder}` }}
          />
        </Box>
        
        {errors.actions && (
          <Typography variant="caption" color="error" sx={{ display: "block", mb: 1, fontWeight: 600 }}>
            {errors.actions}
          </Typography>
        )}
        
        {actionsLoading ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <CircularProgress size={24} sx={{ color: THEME.primary }} />
          </Box>
        ) : permissionGroups.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Aucune permission n'existe encore. Créez-en depuis l'onglet « Rôles et permissions ».
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {permissionGroups.map((group) => {
              const ids = group.items.map((i) => i.id);
              const count = ids.filter((id) => selectedActions.includes(id)).length;
              return (
                <Box key={group.key} sx={{ border: `1px solid ${group.borderColor}`, borderRadius: 1.5, p: 1.5, bgcolor: group.color }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <Checkbox
                      size="small"
                      checked={count === ids.length}
                      indeterminate={count > 0 && count < ids.length}
                      onChange={() => toggleGroup(group)}
                      disabled={isFormDisabled}
                      inputProps={{ "aria-label": `Tout sélectionner : ${group.category}` }}
                      sx={{ p: 0.5, mr: 0.5, color: THEME.gray700, "&.Mui-checked, &.MuiCheckbox-indeterminate": { color: THEME.primaryDark } }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{group.category}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>{count}/{ids.length}</Typography>
                  </Box>
                  {/* 🔧 Remplacement de Grid par Box avec CSS Grid */}
                  <Box sx={{ display: "grid", gridTemplateColumns: group.items.length === 1 ? "1fr" : { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1 }}>
                    {group.items.map((action) => {
                      const isChecked = selectedActions.includes(action.id);
                      return (
                        <Box
                          key={action.id}
                          component="label"
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            p: 1,
                            height: "100%",
                            borderRadius: 1,
                            bgcolor: isChecked ? THEME.white : "rgba(255,255,255,0.6)",
                            border: `1px solid ${isChecked ? THEME.primary : "rgba(0,0,0,0.06)"}`,
                            cursor: isFormDisabled ? "not-allowed" : "pointer",
                            opacity: isFormDisabled ? 0.6 : 1,
                            "&:hover": { bgcolor: isFormDisabled ? undefined : THEME.white, borderColor: isFormDisabled ? undefined : THEME.primary },
                          }}
                        >
                          <Checkbox
                            checked={isChecked}
                            onChange={() => {
                              toggleAction(action.id);
                              clearError("actions");
                            }}
                            size="small"
                            disabled={isFormDisabled}
                            sx={{ p: 0.5, mr: 1, color: THEME.gray700, "&.Mui-checked": { color: THEME.primaryDark } }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 0.2, flexWrap: "wrap" }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: THEME.gray900 }}>
                                {action.label}
                              </Typography>
                              <Chip size="small" label={action.id} sx={{ ...codeChipSx, height: 18, fontSize: "0.65rem" }} />
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.25 }}>
                              {action.description}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
          Annuler
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isFormDisabled}
          sx={primaryButtonSx}
          endIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {actionsLoading
            ? "Chargement..."
            : isSubmitting
            ? "Enregistrement…"
            : isEdit
            ? "Enregistrer les modifications"
            : "Créer l'utilisateur"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function SectionTitle({ icon, title, optional = false }) {
  return (
    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
      {icon} {title}
      {optional && (
        <Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 400 }}>
          (facultatif)
        </Typography>
      )}
    </Typography>
  );
}

function Info({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value || "—"}
      </Typography>
    </Box>
  );
}