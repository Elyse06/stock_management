import { Box, Typography, Avatar } from "@mui/material";

export function StatCard({ icon, label, value, color = "primary", onClick, badge }) {
  return (
    <Box
      onClick={onClick}
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
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s ease",
        "&:hover": onClick
          ? {
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              transform: "translateY(-2px)",
              bgcolor: "#FFFDE7",
            }
          : {},
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
        {badge && (
          <Typography
            variant="caption"
            sx={{
              bgcolor: badge.color || "primary.main",
              color: "white",
              px: 1,
              py: 0.3,
              borderRadius: 1,
              fontWeight: 600,
            }}
          >
            {badge.label}
          </Typography>
        )}
      </Box>
      <Typography variant="h4" fontWeight={700} color="text.primary">
        {value}
      </Typography>
      {onClick && (
        <Typography variant="caption" color="primary.main" sx={{ mt: 0.5 }}>
          Cliquez pour voir les détails →
        </Typography>
      )}
    </Box>
  );
}