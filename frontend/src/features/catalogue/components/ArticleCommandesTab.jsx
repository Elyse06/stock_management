import { Box, Typography, Alert, Table, TableHead, TableBody, TableRow, TableCell } from "@mui/material";
import { ShoppingCart as ShoppingCartIcon } from "@mui/icons-material";
import { StatusChip } from "../../../components/common/StatusChip";
import { EmptyValue } from "../../../components/common/EmptyValue";
import { formatDate } from "../../../utils/formatters";

export function ArticleCommandesTab({ commandes_recentes }) {
  return (
    <Box>
      <Typography
        variant="h3"
        sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
      >
        <ShoppingCartIcon color="primary" />
        10 dernières commandes
      </Typography>
      {commandes_recentes.length > 0 ? (
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
                N°
              </TableCell>
              <TableCell
                sx={{
                  bgcolor: "#FFF8E1",
                  fontWeight: 600,
                  borderBottom: "2px solid #F9A825",
                }}
              >
                Date
              </TableCell>
              <TableCell
                sx={{
                  bgcolor: "#FFF8E1",
                  fontWeight: 600,
                  borderBottom: "2px solid #F9A825",
                }}
              >
                Objet
              </TableCell>
              <TableCell
                sx={{
                  bgcolor: "#FFF8E1",
                  fontWeight: 600,
                  borderBottom: "2px solid #F9A825",
                }}
              >
                Demandeur
              </TableCell>
              <TableCell
                sx={{
                  bgcolor: "#FFF8E1",
                  fontWeight: 600,
                  borderBottom: "2px solid #F9A825",
                }}
              >
                Statut
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {commandes_recentes.map((c) => (
              <TableRow
                key={c.commande_id}
                sx={{ "&:hover": { bgcolor: "#FFFDE7" } }}
              >
                <TableCell>
                  <Typography
                    variant="body2"
                    fontFamily="monospace"
                    fontWeight={600}
                  >
                    #{c.commande_id}
                  </Typography>
                </TableCell>
                <TableCell>{formatDate(c.date_commande)}</TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{ maxWidth: 200 }}
                    title={c.objet}
                  >
                    <EmptyValue value={c.objet} />
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    <EmptyValue value={c.demandeur} />
                  </Typography>
                </TableCell>
                <TableCell>
                  <StatusChip status={c.statut} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Alert severity="info">
          Aucune commande liée à cet article.
        </Alert>
      )}
    </Box>
  );
}