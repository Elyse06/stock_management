import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";

export function ProduitsDormantsTable({ data }) {
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
        Produits dormants (sans mouvement depuis 3 mois)
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" }}>
              Article
            </TableCell>
            <TableCell sx={{ bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" }}>
              Désignation
            </TableCell>
            <TableCell sx={{ bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" }}>
              Dernier mouvement
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length > 0 ? (
            data.map((item) => (
              <TableRow key={item.article_code} sx={{ "&:hover": { bgcolor: "#FFFDE7" } }}>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {item.article_code}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{item.designation}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {item.dernier_mouvement
                      ? new Date(item.dernier_mouvement).toLocaleDateString("fr-FR")
                      : "Jamais"}
                  </Typography>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Aucun produit dormant
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  );
}