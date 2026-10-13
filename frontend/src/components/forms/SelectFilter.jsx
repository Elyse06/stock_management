import { useId } from "react";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";

/** Liste déroulante simple : ``options`` = ``[{value, label}]``. Le libellé est relié au champ (accessibilité). */
export function SelectFilter({ label, value, onChange, options, size = "small", minWidth = 150, fullWidth, required, sx, ...props }) {
  const labelId = useId();
  return (
    <FormControl size={size} required={required} fullWidth={fullWidth} sx={{ minWidth, ...sx }}>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select labelId={labelId} value={value ?? ""} label={label} onChange={(e) => onChange(e.target.value)} {...props}>
        {options.map((opt) => (
          <MenuItem key={`${opt.value}`} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
