import { Chip, CircularProgress, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { Add as AddIcon, Visibility as VisibilityIcon } from "@mui/icons-material";

import { URGENCES } from "../../constants/kpis";

const ENTETE = { bgcolor: "#FFF8E1", fontWeight: 600, borderBottom: "2px solid #F9A825" };

function Cellule({ col, valeur }) {
  switch (col.kind) {
    case "code":
      return (
        <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
          {valeur}
        </Typography>
      );
    case "urgence": {
      const urgence = URGENCES[valeur] ?? { label: valeur, color: "default" };
      return <Chip label={urgence.label} color={urgence.color} size="small" />;
    }
    case "date":
      return (
        <Typography variant="body2">
          {valeur ? new Date(valeur).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Jamais"}
        </Typography>
      );
    case "nombre":
      return (
        <Typography variant="body2" fontWeight={700} fontFamily="monospace">
          {valeur}
        </Typography>
      );
    default:
      return <Typography variant="body2">{valeur ?? "—"}</Typography>;
  }
}

const ligneMessage = (colSpan, contenu) => (
  <TableRow>
    <TableCell colSpan={colSpan} align="center" sx={{ py: 4 }}>
      {contenu}
    </TableCell>
  </TableRow>
);

/** Tableau du détail d'un indicateur. ``onAction`` absent = pas de colonne d'action. */
export function KPITable({ config, rows, loading, onAction }) {
  const colSpan = config.columns.length + (onAction ? 1 : 0);
  const ActionIcon = config.action === "view_article" ? VisibilityIcon : AddIcon;

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          {config.columns.map((col) => (
            <TableCell key={col.field} sx={{ ...ENTETE, width: col.width, textAlign: col.align || "left" }}>
              {col.label}
            </TableCell>
          ))}
          {onAction && <TableCell sx={{ ...ENTETE, width: 100, textAlign: "center" }}>Action</TableCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {loading && ligneMessage(colSpan, <CircularProgress size={24} />)}
        {!loading && rows.length === 0 &&
          ligneMessage(colSpan, <Typography variant="body2" color="text.secondary">Aucune donnée disponible</Typography>)}
        {!loading &&
          rows.map((row, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <TableRow key={`${row.code_article ?? row.mouvement_id ?? ""}-${index}`} hover>
              {config.columns.map((col) => (
                <TableCell key={col.field} sx={{ textAlign: col.align || "left" }}>
                  <Cellule col={col} valeur={row[col.field]} />
                </TableCell>
              ))}
              {onAction && (
                <TableCell align="center">
                  <IconButton size="small" color="primary" onClick={() => onAction(row)} aria-label="Action">
                    <ActionIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}
