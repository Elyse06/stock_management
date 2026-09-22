import { Box, Typography, Alert, Table, TableHead, TableBody, TableRow, TableCell, Chip } from "@mui/material";
import { QrCode as QrCodeIcon } from "@mui/icons-material";

export function ArticleTracabiliteTab({ attributions_actives }) {
  return (
    <Box>
      <Typography
        variant="h3"
        sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
      >
        <QrCodeIcon color="primary" />
        Attributions actives
      </Typography>
      {attributions_actives.length > 0 ? (
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
                Bénéficiaire
              </TableCell>
              <TableCell
                sx={{
                  bgcolor: "#FFF8E1",
                  fontWeight: 600,
                  borderBottom: "2px solid #F9A825",
                }}
              >
                Site
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  bgcolor: "#FFF8E1",
                  fontWeight: 600,
                  borderBottom: "2px solid #F9A825",
                }}
              >
                Quantité sortie
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  bgcolor: "#FFF8E1",
                  fontWeight: 600,
                  borderBottom: "2px solid #F9A825",
                }}
              >
                QR Code
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {attributions_actives.map((a, idx) => (
              <TableRow key={idx} sx={{ "&:hover": { bgcolor: "#FFFDE7" } }}>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {a.beneficiaire_nom || "—"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {a.beneficiaire_type === "DIRECTION"
                      ? "Direction"
                      : [a.matricule, a.fonction].filter(Boolean).join(" • ") || "Employé"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={a.site || "—"}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    fontFamily="monospace"
                  >
                    {a.quantite_sortie}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    icon={<QrCodeIcon />}
                    label={a.code_unique_qr?.substring(0, 8) + "..."}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Alert severity="info">
          Aucune attribution active pour cet article.
        </Alert>
      )}
    </Box>
  );
}