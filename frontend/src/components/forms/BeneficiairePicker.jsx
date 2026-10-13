import { Autocomplete, Box, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";

import { getEmployeLocation } from "@/utils/employe";
import { useDirections, useEmployees, useSalles, useSites } from "@/hooks/useReferenceData";
import { getBeneficiaireMeta } from "@/utils/beneficiaireMeta";
import { TYPES_BENEFICIAIRE } from "@/utils/beneficiaire";

const CONFIG = {
  EMPLOYE: {
    article: "un employé",
    label: (e) => (e?.emp_nom ? `${e.emp_nom} (${e.emp_matricule})` : ""),
    detail: (e) => {
      const loc = getEmployeLocation(e);
      return [e.emp_matricule, e.emp_fonction, loc?.direction, loc?.site].filter(Boolean).join(" • ");
    },
    key: "emp_id",
  },
  DIRECTION: {
    article: "une direction",
    label: (d) => d?.dir_libelle || "",
    detail: (d) => d.dir_description,
    key: "dir_id",
  },
  SITE: {
    article: "un site",
    label: (s) => (s?.site_nom ? `${s.site_nom} (${s.site_type === "SIEGE" ? "Siège" : "Agence"})` : ""),
    detail: (s) => s.localite,
    key: "site_id",
  },
  SALLE: {
    article: "une salle",
    label: (s) => (s?.nom ? `${s.nom}${s.localite_nom ? ` (${s.localite_nom})` : ""}` : ""),
    detail: (s) => s.localite_nom || "Siège",
    key: "salle_id",
  },
};

/**
 * Choix d'un bénéficiaire : employé, direction, site ou salle.
 * ``value`` = ``{type, item}`` ; ``types`` permet de restreindre les choix proposés.
 */
export function BeneficiairePicker({ value, onChange, types = TYPES_BENEFICIAIRE, label = "Nouveau bénéficiaire", required, size = "medium" }) {
  const type = value?.type ?? types[0];
  const listes = {
    EMPLOYE: useEmployees({ enabled: type === "EMPLOYE" }),
    DIRECTION: useDirections({ enabled: type === "DIRECTION" }),
    SITE: useSites({ enabled: type === "SITE" }),
    SALLE: useSalles({ enabled: type === "SALLE" }),
  };
  const { data: options = [], isLoading } = listes[type];
  const config = CONFIG[type];

  return (
    <Box>
      {label && (
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {label}
        </Typography>
      )}
      <ToggleButtonGroup
        value={type}
        exclusive
        size="small"
        onChange={(_, nouveau) => nouveau && onChange({ type: nouveau, item: null })}
        sx={{
          mb: 2,
          flexWrap: "wrap",
          "& .MuiToggleButton-root": {
            px: 2,
            py: 0.75,
            border: "1px solid #E0E0E0",
            "&.Mui-selected": { bgcolor: "tint.main", borderColor: "primary.main", color: "primary.main", fontWeight: 600 },
          },
        }}
      >
        {types.map((t) => {
          const { Icon, label: libelle } = getBeneficiaireMeta(t);
          return (
            <ToggleButton key={t} value={t}>
              <Icon fontSize="small" sx={{ mr: 0.5 }} />
              {libelle}
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>

      <Autocomplete
        size={size}
        options={options}
        loading={isLoading}
        value={value?.item ?? null}
        onChange={(_, item) => onChange({ type, item })}
        getOptionLabel={config.label}
        isOptionEqualToValue={(o, v) => String(o?.[config.key]) === String(v?.[config.key])}
        noOptionsText="Aucun résultat"
        renderInput={(params) => <TextField {...params} label={`Sélectionner ${config.article}`} required={required} />}
        renderOption={(props, option) => {
          const { key, ...rest } = props;
          return (
            <li key={key} {...rest}>
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  {config.label(option)}
                </Typography>
                {config.detail(option) && (
                  <Typography variant="caption" color="text.secondary">
                    {config.detail(option)}
                  </Typography>
                )}
              </Box>
            </li>
          );
        }}
      />
    </Box>
  );
}
