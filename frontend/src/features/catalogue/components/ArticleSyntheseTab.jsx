import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { TrendingUp as TrendingUpIcon } from "@mui/icons-material";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function ArticleSyntheseTab({ evolution_data }) {
  const theme = useTheme();

  return (
    <Box>
      <Typography
        variant="h3"
        sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
      >
        <TrendingUpIcon color="primary" />
        Vue d'ensemble
      </Typography>

      {evolution_data.length > 0 && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            bgcolor: "#FAFAFA",
            borderRadius: 1,
            border: "1px solid #E0E0E0",
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1, fontWeight: 600 }}
          >
            Évolution récente du stock
          </Typography>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={evolution_data}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="stock"
                stroke={theme.palette.primary.main}
                strokeWidth={2}
                dot={{ fill: theme.palette.secondary.main, stroke: theme.palette.primary.main, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
}