import { Box, Typography } from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function StockEvolutionChart({ data }) {
  return (
    <Box
      sx={{
        p: 2,
        bgcolor: "#FFFFFF",
        borderRadius: 1,
        border: "1px solid #E0E0E0",
      }}
    >
      <Typography variant="h3" sx={{ mb: 2 }}>
        Évolution du stock (12 derniers mois)
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mois" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="stock_total"
            stroke="#F9A825"
            strokeWidth={2}
            dot={{ fill: "#F9A825", r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}