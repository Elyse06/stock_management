import { Box, Typography, Alert, Table, TableHead, TableBody, TableRow, TableCell } from "@mui/material";
import { TrendingUp as TrendingUpIcon, People as PeopleIcon } from "@mui/icons-material";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "../../../utils/formatters";

export function ArticleSyntheseTab({ evolution_data, fournisseurs }) {
  return (
    <Box>
      <Typography
        variant="h3"
        sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
      >
        <TrendingUpIcon color="primary" />
        Vue d'ensemble
      </Typography>

      {/* Mini graphique d'évolution */}
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
                stroke="#F9A825"
                strokeWidth={2}
                dot={{ fill: "#F9A825", r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Fournisseurs */}
      <Typography
        variant="h3"
        sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}
      >
        <PeopleIcon color="primary" />
        Fournisseurs ({fournisseurs.length})
      </Typography>
      {fournisseurs.length > 0 ? (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  bgcolor: "#FFF8E1",
                  fontWeight: 600,
                  borderBottom: "2px solid #F9A825",
                }}
              >
                Fournisseur
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  bgcolor: "#FFF8E1",
                  fontWeight: 600,
                  borderBottom: "2px solid #F9A825",
                }}
              >
                Prix d'achat
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fournisseurs.map((f) => (
              <TableRow
                key={f.fournisseur_id}
                sx={{ "&:hover": { bgcolor: "#FFFDE7" } }}
              >
                <TableCell>{f.fournisseur_nom}</TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    fontFamily="monospace"
                    fontWeight={600}
                  >
                    {formatCurrency(f.prix_achat)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Alert severity="info">Aucun fournisseur associé</Alert>
      )}
    </Box>
  );
}