import { Box, IconButton, InputAdornment, TextField, Tooltip } from "@mui/material";
import {
  Autorenew as GenerateIcon,
  Email as EmailIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";
import { useState } from "react";

import { PASSWORD_MIN_LENGTH } from "@/constants/permissions";

import { THEME } from "../../constants/theme";
import { genererMotDePasse } from "../../utils/password";

import { SectionTitle } from "./SectionTitle";

/** Adresse e-mail (identifiant) et mot de passe. */
export function IdentifiantsSection({ form, disabled }) {
  const [visible, setVisible] = useState(false);

  const generer = () => {
    form.setPassword(genererMotDePasse());
    setVisible(true);
    form.clearError("password");
  };

  return (
    <>
      <SectionTitle icon={<EmailIcon fontSize="small" sx={{ color: THEME.primary }} />} title="Identifiants" />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "7fr 5fr" }, gap: 2, mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          type="email"
          label="Adresse email"
          placeholder="prenom.nom@paositra.mg"
          value={form.mail}
          onChange={(e) => {
            form.setMail(e.target.value);
            form.clearError("mail");
          }}
          error={Boolean(form.errors.mail)}
          helperText={form.errors.mail || "Sert d'identifiant de connexion"}
          autoComplete="off"
          autoFocus
          required
          disabled={disabled}
          slotProps={{ htmlInput: { maxLength: 254 } }}
        />
        <TextField
          fullWidth
          size="small"
          label={form.isEdit ? "Nouveau mot de passe" : "Mot de passe"}
          type={visible ? "text" : "password"}
          value={form.password}
          onChange={(e) => {
            form.setPassword(e.target.value);
            form.clearError("password");
          }}
          error={Boolean(form.errors.password)}
          helperText={
            form.errors.password ||
            (form.isEdit ? "Laissez vide pour le conserver" : `${PASSWORD_MIN_LENGTH} caractères minimum, pas uniquement des chiffres`)
          }
          required={!form.isEdit}
          autoComplete="new-password"
          disabled={disabled}
          slotProps={{
            htmlInput: { maxLength: 128 },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Générer un mot de passe">
                    <IconButton size="small" onClick={generer} disabled={disabled} aria-label="Générer un mot de passe">
                      <GenerateIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <IconButton
                    size="small"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {visible ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
    </>
  );
}
