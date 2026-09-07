import { Box, Typography } from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = ["#F9A825", "#FFB74D", "#FFD54F", "#FFF176", "#FFF9C4"];

export function MagasinDistributionChart({ data }) {
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
        Répartition par magasin
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="stock"
            nameKey="magasin"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
}