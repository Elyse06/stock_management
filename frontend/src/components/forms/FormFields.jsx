import { Grid, MenuItem, TextField } from "@mui/material";

/**
 * Champs de formulaire déclaratifs.
 *
 * >>> <FormFields form={form} onChange={setField} fields={[
 * ...   { name: "nom", label: "Nom", required: true, maxLength: 50 },
 * ...   { name: "type", label: "Type", options: [{ value: "A", label: "A" }], xs: 6 },
 * ... ]} />
 */
export function FormFields({ fields, form, onChange, errors = {}, disabled = false }) {
  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      {fields.map(({ name, label, xs = 12, sm, options, maxLength, multiline, rows = 3, type, required, helperText, autoFocus, ...rest }) => (
        <Grid key={name} size={{ xs, sm: sm ?? xs }}>
          <TextField
            label={label}
            value={form[name] ?? ""}
            onChange={(e) => onChange(name, e.target.value)}
            select={Boolean(options)}
            type={type}
            required={required}
            multiline={multiline}
            rows={multiline ? rows : undefined}
            autoFocus={autoFocus}
            disabled={disabled || rest.disabled}
            error={Boolean(errors[name])}
            helperText={errors[name] || helperText}
            slotProps={{ htmlInput: maxLength ? { maxLength } : undefined }}
            fullWidth
          >
            {options?.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      ))}
    </Grid>
  );
}

