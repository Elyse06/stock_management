import { Alert } from "@mui/material";

export function ErrorAlert({ error, onClose }) {
  if (!error) return null;
  
  return (
    <Alert severity="error" onClose={onClose} sx={{ mb: 2 }}>
      {error}
    </Alert>
  );
}