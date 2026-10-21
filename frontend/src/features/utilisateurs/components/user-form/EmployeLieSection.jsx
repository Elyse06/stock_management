import { Autocomplete, Box, TextField, Typography } from "@mui/material";
import { Badge as BadgeIcon, Person as PersonIcon } from "@mui/icons-material";

import { THEME } from "../../constants/theme";

import { Info, SectionTitle } from "./SectionTitle";

/** Employé rattaché au compte (un employé ne peut avoir qu'un seul compte). */
export function EmployeLieSection({ form, employees, utilisateurId, disabled }) {
  const selection = employees.find((e) => e.emp_id === form.empId) || null;
  const lieAUnAutre = (employe) =>
    Boolean(employe.emp_utilisateur_id && String(employe.emp_utilisateur_id) !== String(utilisateurId ?? ""));

  return (
    <>
      <SectionTitle icon={<BadgeIcon fontSize="small" sx={{ color: THEME.primary }} />} title="Employé rattaché" optional />
      <Box sx={{ mb: 3 }}>
        <Autocomplete
          value={selection}
          onChange={(_, value) => form.setEmpId(value ? value.emp_id : "")}
          options={employees}
          isOptionEqualToValue={(o, v) => o.emp_id === v.emp_id}
          getOptionLabel={(o) => (o ? `${o.emp_nom} (${o.emp_matricule})` : "")}
          getOptionDisabled={lieAUnAutre}
          disabled={disabled}
          renderOption={(props, option) => {
            const { key, ...rest } = props;
            const indisponible = lieAUnAutre(option);
            return (
              <Box component="li" key={key} {...rest} sx={{ opacity: indisponible ? 0.5 : 1 }}>
                <PersonIcon fontSize="small" sx={{ color: THEME.gray700, mr: 1 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {option.emp_nom}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.emp_matricule} · {option.emp_fonction || "Fonction non renseignée"}
                    {indisponible && " · Déjà lié à un autre compte"}
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
              error={Boolean(form.errors.emp_id)}
              helperText={form.errors.emp_id || "Permet de pré-remplir ses demandes internes"}
            />
          )}
          noOptionsText="Aucun employé trouvé"
          clearText="Effacer"
        />
        {selection && (
          <Box
            sx={{
              mt: 1.5,
              p: 1.5,
              bgcolor: THEME.primaryVeryLight,
              borderRadius: 1,
              border: `1px solid ${THEME.primaryBorder}`,
              display: "flex",
              flexWrap: "wrap",
              gap: 3,
            }}
          >
            <Info label="Fonction" value={selection.emp_fonction} />
            <Info label="Direction" value={selection.direction_libelle} />
            <Info label="Service" value={selection.service_libelle} />
            <Info label="Contact" value={selection.emp_contact} />
          </Box>
        )}
      </Box>
    </>
  );
}
