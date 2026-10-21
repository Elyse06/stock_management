import { Box } from "@mui/material";

export function MatriculeChip({ value }) {
  return (
    <Box
      component="span"
      sx={{
        fontFamily: "monospace",
        fontWeight: 700,
        bgcolor: "#FFF8E1",
        color: "#E65100",
        border: "1px solid #FFE082",
        borderRadius: 1,
        px: 1,
        py: 0.5,
        fontSize: 12,
      }}
    >
      {value}
    </Box>
  );
}
