import { Box, Typography } from "@mui/material";

export function SectionTitle({ icon, title, optional = false }) {
  return (
    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
      {icon} {title}
      {optional && (
        <Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 400 }}>
          (facultatif)
        </Typography>
      )}
    </Typography>
  );
}

export function Info({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value || "—"}
      </Typography>
    </Box>
  );
}
