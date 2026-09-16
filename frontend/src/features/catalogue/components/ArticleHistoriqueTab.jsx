import { Box, Typography, Alert, Table, TableHead, TableBody, TableRow, TableCell } from "@mui/material";
import { History as HistoryIcon } from "@mui/icons-material";
import { StatusChip } from "../../../components/common/StatusChip";
import { EmptyValue } from "../../../components/common/EmptyValue";
import { formatDateTime } from "../../../utils/formatters";

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
                Date
              </TableCell>
              <TableCell
                sx={{
                  bgcolor: "#FFF8E1",
                  fontWeight: 600,
                  borderBottom: "2px solid #F9A825",
                }}
              >
                Type
              </TableCell>
              <TableCell
                sx={{
                  bgcolor: "#FFF8E1",
                  fontWeight: 600,
                  borderBottom: "2px solid #F9A825",
                }}
              >
                Source / Dest.
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  bgcolor: "#FFF8E1",
                  fontWeight: 600,
                  borderBottom: "2px solid #F9A825",
                }}
              >
                Qté
              </TableCell>
              <TableCell
                sx={{
                  bgcolor: "#FFF8E1",
                  fontWeight: 600,
                  borderBottom: "2px solid #F9A825",
                }}
              >
                Origine
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {historique_recents.map((h, idx) => (
              <TableRow key={idx} sx={{ "&:hover": { bgcolor: "#FFFDE7" } }}>
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
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    fontFamily="monospace"
                  >
                    {h.quantite}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{ maxWidth: 200 }}
                    title={h.origine}
                  >
                    <EmptyValue value={h.origine} />
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Alert severity="info">
          Aucun mouvement enregistré pour cet article.
        </Alert>
      )}
    </Box>
  );
}