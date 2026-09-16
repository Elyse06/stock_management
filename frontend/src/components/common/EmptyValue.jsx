import { Chip } from "@mui/material";

export function EmptyValue({ value, render }) {
  if (!value) {
    return <Chip label="—" size="small" variant="outlined" sx={{ borderColor: "#E0E0E0" }} />;
  }
  return render ? render(value) : value;
}