import { Box, Card, CardContent, Typography } from "@mui/material";
import { CheckCircle as CheckCircleIcon, Security as SecurityIcon } from "@mui/icons-material";

import { THEME } from "../../constants/theme";

import { SectionTitle } from "./SectionTitle";

/** Profils prédéfinis : un clic applique l'ensemble de leurs permissions. */
export function ProfilSection({ form, disabled }) {
  return (
    <>
      <SectionTitle icon={<SecurityIcon fontSize="small" sx={{ color: THEME.primary }} />} title="Profil d'accès" />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, gap: 1.5, mb: 1 }}>
        {form.selectableRoles.map((preset) => {
          const selectionne = form.roleId === preset.id;
          const appliquer = () => !disabled && form.applyPreset(preset);
          return (
            <Card
              key={preset.id}
              variant="outlined"
              onClick={appliquer}
              role="button"
              tabIndex={0}
              aria-pressed={selectionne}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  appliquer();
                }
              }}
              sx={{
                cursor: disabled ? "not-allowed" : "pointer",
                height: "100%",
                borderColor: selectionne ? THEME.primary : THEME.gray200,
                bgcolor: selectionne ? THEME.primarySoft : THEME.white,
                opacity: disabled ? 0.6 : 1,
                "&:hover": { borderColor: disabled ? THEME.gray200 : THEME.primary },
              }}
            >
              <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
                    {preset.label}
                  </Typography>
                  {selectionne && <CheckCircleIcon sx={{ color: THEME.primaryDark, fontSize: 18 }} />}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.25 }}>
                  {preset.description}
                </Typography>
              </CardContent>
            </Card>
          );
        })}
      </Box>
      {form.roleId === "CUSTOM" && (
        <Typography variant="caption" sx={{ color: THEME.textStrong, fontWeight: 600 }}>
          Profil personnalisé : les permissions ne correspondent à aucun modèle.
        </Typography>
      )}
    </>
  );
}
