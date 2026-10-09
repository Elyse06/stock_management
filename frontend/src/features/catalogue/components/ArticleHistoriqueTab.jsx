import { Box, Typography, Alert, TableRow, TableCell } from "@mui/material";
import { History as HistoryIcon } from "@mui/icons-material";
import { StatusChip } from "../../../components/common/StatusChip";
import { EmptyValue } from "../../../components/common/EmptyValue";
import { StyledTable } from "../../../components/common/StyledTable";
import { formatDateTime } from "../../../utils/formatters";

const COLUMNS = [
  { label: "Date" },
  { label: "Type" },
  { label: "Source / Dest." },
  { label: "Qté", align: "center" },
  { label: "Origine" },
];

export function ArticleHistoriqueTab({ historique_recents }) {
  return (
    <Box>
      <Typography
        variant="h3"
        sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
      >
        <HistoryIcon color="primary" />
        10 derniers mouvements
      </Typography>
      {historique_recents.length > 0 ? (
        <StyledTable columns={COLUMNS}>
          {historique_recents.map((h, idx) => (
            <TableRow key={idx}>
              <TableCell>{formatDateTime(h.date)}</TableCell>
              <TableCell>
                <StatusChip status={h.type_mouvement} />
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  <EmptyValue value={h.magasin_source} /> →{" "}
                  <EmptyValue value={h.magasin_destination} />
                </Typography>
                {h.beneficiaire && (
                  <Typography variant="caption" color="text.secondary">
                    Bénéficiaire : {h.beneficiaire}
                  </Typography>
                )}
              </TableCell>
              <TableCell align="center">
                <Typography variant="body2" fontWeight={700} fontFamily="monospace">
                  {h.quantite}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography
                  variant="body2"
                  noWrap
                  sx={{ maxWidth: { xs: 140, sm: 200 } }}
                  title={h.origine}
                >
                  <EmptyValue value={h.origine} />
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </StyledTable>
      ) : (
        <Alert severity="info">Aucun mouvement enregistré pour cet article.</Alert>
      )}
    </Box>
  );
}
