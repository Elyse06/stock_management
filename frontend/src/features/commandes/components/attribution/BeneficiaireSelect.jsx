import { FormControl, MenuItem, Select } from "@mui/material";

import { idDe, libelleBeneficiaire } from "../../utils/attributions";

/** Liste déroulante des bénéficiaires d'un type. */
export function BeneficiaireSelect({ type, value, options, onChange, placeholder = "Sélectionner..." }) {
  return (
    <FormControl size="small" fullWidth>
      <Select
        value={idDe(type, value)}
        displayEmpty
        inputProps={{ "aria-label": "Bénéficiaire" }}
        onChange={(e) => onChange(options.find((o) => idDe(type, o) === e.target.value) || null)}
      >
        <MenuItem value="" disabled>
          <em>{options.length ? placeholder : "Aucun choix disponible"}</em>
        </MenuItem>
        {options.map((option) => (
          <MenuItem key={idDe(type, option)} value={idDe(type, option)}>
            {libelleBeneficiaire(type, option)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

/** Choix du type de bénéficiaire (employé, direction, site ou salle). */
export function TypeSelect({ value, onChange, types }) {
  return (
    <FormControl size="small" fullWidth>
      <Select value={value} onChange={(e) => onChange(e.target.value)} inputProps={{ "aria-label": "Type de bénéficiaire" }}>
        {types.map((t) => (
          <MenuItem key={t.value} value={t.value}>
            {t.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
