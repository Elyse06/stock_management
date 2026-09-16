import { Typography } from "@mui/material";

export function CodeChip({ value }) {
  return (
    <Typography
      variant="body2"
      fontFamily="monospace"
      fontWeight={600}
      sx={{
        bgcolor: "#FFF8E1",
        px: 1,
        py: 0.3,
        borderRadius: 0.5,
        border: "1px solid #F9A825",
      }}
    >
      {value}
    </Typography>
  );
}