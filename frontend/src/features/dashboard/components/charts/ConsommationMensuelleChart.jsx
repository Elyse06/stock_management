import { Box, Typography } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function ConsommationMensuelleChart({ data }) {
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
        Consommation mensuelle (12 derniers mois)
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mois" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="quantite_sortie" fill="#F9A825" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}