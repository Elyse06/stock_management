import { Box, Typography, Alert, TableRow, TableCell } from "@mui/material";
import { ShoppingCart as ShoppingCartIcon } from "@mui/icons-material";
import { StatusChip } from "../../../components/common/StatusChip";
import { EmptyValue } from "../../../components/common/EmptyValue";
import { StyledTable } from "../../../components/common/StyledTable";
import { formatDate } from "../../../utils/formatters";

const COLUMNS = [
  { label: "N°" },
  { label: "Date" },
  { label: "Objet" },
  { label: "Demandeur" },
  { label: "Statut" },
];

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
        <StyledTable columns={COLUMNS}>
          {commandes_recentes.map((c) => (
            <TableRow key={c.commande_id}>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                  #{c.commande_id}
                </Typography>
              </TableCell>
              <TableCell>{formatDate(c.date_commande)}</TableCell>
              <TableCell>
                <Typography
                  variant="body2"
                  noWrap
                  sx={{ maxWidth: { xs: 140, sm: 200 } }}
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
        </StyledTable>
      ) : (
        <Alert severity="info">Aucune commande liée à cet article.</Alert>
      )}
    </Box>
  );
}
