import { Box } from "@mui/material";

export function FormSection({ children }) {
  return (
    <Box
      sx={{
        p: 2,
        bgcolor: "#FAFAFA",
        borderRadius: 1,
        border: "1px dashed #E0E0E0",
        mb: 2,
      }}
    >
      {children}
    </Box>
  );
}