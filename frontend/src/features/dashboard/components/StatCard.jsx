import { Box, Typography, Avatar } from "@mui/material";

export function StatCard({ icon, label, value, color = "primary" }) {
  return (
    <Box
      sx={{
        p: 2,
        bgcolor: "#FFFFFF",
        borderRadius: 1,
        border: "1px solid #E0E0E0",
        borderLeft: "4px solid",
        borderColor: "primary.main",
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Avatar
          sx={{
            bgcolor: "#FFF8E1",
            color: "primary.main",
            width: 36,
            height: 36,
          }}
        >
          {icon}
        </Avatar>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {label}
        </Typography>
      </Box>
      <Typography variant="h4" fontWeight={700} color="text.primary">
        {value}
      </Typography>
    </Box>
  );
}