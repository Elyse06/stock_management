import { Box, Typography, Alert, TableRow, TableCell, Chip } from "@mui/material";
import { QrCode as QrCodeIcon } from "@mui/icons-material";
import { StyledTable } from "../../../components/common/StyledTable";

const COLUMNS = [
  { label: "Bénéficiaire" },
  { label: "Site" },
  { label: "Quantité sortie", align: "center" },
  { label: "QR Code", align: "center" },
];

function beneficiaireType(a) {
  if (a.beneficiaire_type === "DIRECTION") return "Direction";
  if (a.beneficiaire_type === "SALLE") return "Salle";
  if (a.beneficiaire_type === "SITE") return "Site";
  return [a.matricule, a.fonction].filter(Boolean).join(" • ") || "Employé";
}

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
        <StyledTable columns={COLUMNS}>
          {attributions_actives.map((a, idx) => (
            <TableRow key={idx}>
              <TableCell>
                <Typography variant="body2" fontWeight={600}>
                  {a.beneficiaire_nom || "—"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {beneficiaireType(a)}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip label={a.site || "—"} size="small" variant="outlined" />
              </TableCell>
              <TableCell align="center">
                <Typography variant="body2" fontWeight={700} fontFamily="monospace">
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
        </StyledTable>
      ) : (
        <Alert severity="info">Aucune attribution active pour cet article.</Alert>
      )}
    </Box>
  );
}
