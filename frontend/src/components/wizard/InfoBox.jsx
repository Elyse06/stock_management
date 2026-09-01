import { Box, Typography } from "@mui/material";

export function InfoBox({ title, subtitle, icon, children }) {
  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        bgcolor: "#FFF8E1",
        borderRadius: 1,
        border: "1px solid #F9A825",
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      {icon}
      <Box>
        {title && (
          <Typography variant="body2" fontWeight={600}>
            {title}
          </Typography>
        )}
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        {children}
      </Box>
    </Box>
  );
}