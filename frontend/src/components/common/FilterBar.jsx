import { Box, Button } from "@mui/material";

export function FilterBar({ children, onReset, hasFilters }) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        alignItems: "center",
        mb: 2,
        p: 2,
        bgcolor: "#FAFAFA",
        borderRadius: 1,
        border: "1px solid #E0E0E0",
      }}
    >
      {children}
      {hasFilters && (
        <Button variant="outlined" size="small" onClick={onReset}>
          Réinitialiser
        </Button>
      )}
    </Box>
  );
}