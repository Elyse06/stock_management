import { TextField } from "@mui/material";

const dateField = (label, value, onChange, bornes) => (
  <TextField
    label={label}
    type="date"
    size="small"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    slotProps={{ inputLabel: { shrink: true }, htmlInput: bornes }}
    sx={{ width: { xs: "100%", sm: 160 } }}
  />
);

/** Filtre de période (dates ISO ``AAAA-MM-JJ``) ; la date de fin ne peut précéder le début. */
export function DateRangeFilter({ start, end, onStartChange, onEndChange, startLabel = "Du", endLabel = "Au" }) {
  return (
    <>
      {dateField(startLabel, start, onStartChange, { max: end || undefined })}
      {dateField(endLabel, end, onEndChange, { min: start || undefined })}
    </>
  );
}
