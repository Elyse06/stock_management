import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";

export function SelectFilter({
  label,
  value,
  onChange,
  options,
  size = "small",
  minWidth = 150,
  ...props
}) {
  return (
    <FormControl size={size} sx={{ minWidth }}>
      <InputLabel>{label}</InputLabel>
      <Select value={value} label={label} onChange={(e) => onChange(e.target.value)} {...props}>
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}