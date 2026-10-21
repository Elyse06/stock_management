import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { Security as SecurityIcon } from "@mui/icons-material";
import { useEffect } from "react";

import { getFieldErrors } from "@/lib/api/errors";

import { primaryButtonSx, THEME } from "../constants/theme";
import { useUserForm } from "../hooks/useUserForm";

import { EmployeLieSection } from "./user-form/EmployeLieSection";
import { IdentifiantsSection } from "./user-form/IdentifiantsSection";
import { PermissionsSection } from "./user-form/PermissionsSection";
import { ProfilSection } from "./user-form/ProfilSection";

/** Champs renvoyés par le backend -> champs du formulaire. */
const CHAMPS_API = { utilisateur_mail: "mail", utilisateur_mdp: "password", actions: "actions", emp_id: "emp_id" };

/** Création / modification d'un compte utilisateur. */
export function UserFormDialog({ open, onClose, onSubmit, isSubmitting = false, submitError, initialData = null, employees = [], isSelf = false }) {
  const form = useUserForm({ open, initialData, isSelf });
  const disabled = isSubmitting || form.actionsLoading;
  const { setErrors } = form;

  // Erreurs de validation du serveur affichées sous les champs concernés.
  useEffect(() => {
    const erreurs = getFieldErrors(submitError);
    const mappees = Object.fromEntries(
      Object.entries(erreurs).filter(([champ]) => CHAMPS_API[champ]).map(([champ, message]) => [CHAMPS_API[champ], message]),
    );
    if (Object.keys(mappees).length) setErrors((prev) => ({ ...prev, ...mappees }));
  }, [submitError, setErrors]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.valider()) onSubmit(form.payload());
  };

  const nbErreurs = Object.values(form.errors).filter(Boolean).length;
  const libelle = form.actionsLoading
    ? "Chargement..."
    : isSubmitting
      ? "Enregistrement…"
      : form.isEdit
        ? "Enregistrer les modifications"
        : "Créer l'utilisateur";

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { component: "form", onSubmit: handleSubmit, noValidate: true } }}
    >
      <DialogTitle sx={{ borderBottom: `1px solid ${THEME.gray200}` }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <SecurityIcon sx={{ color: THEME.primary, fontSize: 28 }} />
          <Box>
            <Typography variant="h6" component="span" sx={{ fontWeight: 600, display: "block" }}>
              {form.isEdit ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {form.isEdit
                ? "Mettez à jour l'accès, l'employé rattaché et les permissions."
                : "Créez un compte et choisissez un profil adapté au poste."}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {form.actionsError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Impossible de charger les permissions. Vérifiez votre connexion.
          </Alert>
        )}
        {isSelf && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Vous modifiez votre propre compte : le droit de gestion des utilisateurs ne peut pas être retiré.
          </Alert>
        )}
        {nbErreurs > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Veuillez corriger les erreurs ci-dessous avant de soumettre.
          </Alert>
        )}
        <IdentifiantsSection form={form} disabled={disabled} />
        <EmployeLieSection form={form} employees={employees} utilisateurId={initialData?.utilisateur_id} disabled={disabled} />
        <ProfilSection form={form} disabled={disabled} />
        <PermissionsSection form={form} disabled={disabled} />
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>
          Annuler
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={disabled}
          sx={primaryButtonSx}
          endIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {libelle}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
