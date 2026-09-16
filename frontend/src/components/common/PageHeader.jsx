import { Box, Typography, Button } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";

export function PageHeader({ title, subtitle, actionLabel, onAction, canAction = true }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
      <Box>
        {title && <Typography variant="h2">{title}</Typography>}
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {canAction && actionLabel && (
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}