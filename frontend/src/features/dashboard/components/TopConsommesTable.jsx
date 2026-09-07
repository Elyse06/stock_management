import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";

export function TopConsommesTable({ data }) {
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
        Top 10 Produits les plus consommés (20 jours)
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" }}>
              #
            </TableCell>
            <TableCell sx={{ bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" }}>
              Article
            </TableCell>
            <TableCell
              align="center"
              sx={{ bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" }}
            >
              Quantité consommée
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length > 0 ? (
            data.map((item, index) => (
              <TableRow key={item.article_code} sx={{ "&:hover": { bgcolor: "#FFFDE7" } }}>
                <TableCell>
                  <Typography variant="body2" fontWeight={700} color="primary.main">
                    {index + 1}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {item.article_code}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.designation}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight={700} fontFamily="monospace">
                    {item.quantite_consomme}
                  </Typography>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Aucune donnée disponible
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  );
}