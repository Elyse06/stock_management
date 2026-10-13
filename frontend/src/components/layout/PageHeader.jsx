import { Box, Typography, Button } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";

export function PageHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  canAction = true,
  secondaryActionLabel,
  onSecondaryAction,
  canSecondaryAction = true,
  children,
  onReset,
  hasFilters,
}) {
  const hasFilterBar = Boolean(children);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        gap: 2,
        alignItems: { xs: "stretch", sm: "center" },
        mb: 2,
        p: hasFilterBar ? 2 : 0,
        bgcolor: hasFilterBar ? "#FAFAFA" : "transparent",
        borderRadius: hasFilterBar ? 1 : 0,
        border: hasFilterBar ? "1px solid #E0E0E0" : "none",
        flexWrap: "wrap",
      }}
    >
      <Box sx={{ minWidth: title || subtitle ? { sm: 180 } : 0 }}>
        {title && <Typography variant="h2">{title}</Typography>}
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {hasFilterBar && (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            alignItems: { xs: "stretch", sm: "center" },
            flex: 1,
            flexWrap: "wrap",
          }}
        >
          {children}
          {hasFilters && (
            <Button variant="outlined" size="small" onClick={onReset}>
              Réinitialiser
            </Button>
          )}
        </Box>
      )}
      {canAction && actionLabel && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAction}
          sx={{ ml: { xs: 0, sm: "auto" }, width: { xs: "100%", sm: "auto" } }}
        >
          {actionLabel}
        </Button>
      )}
      {canSecondaryAction && secondaryActionLabel && (
        <Button
          variant="outlined"
          onClick={onSecondaryAction}
          sx={{ ml: actionLabel ? 0 : { xs: 0, sm: "auto" }, width: { xs: "100%", sm: "auto" } }}
        >
          {secondaryActionLabel}
        </Button>
      )}
    </Box>
  );
}