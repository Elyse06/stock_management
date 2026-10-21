import { Alert, Box, Button, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { RestartAlt as RestartAltIcon } from "@mui/icons-material";

const COULEUR_STATUT = { ERREUR: "error", "IGNORÉ": "default" };
const APERCU_MAX = 50;

/** Aperçu (dry-run) d'un import de fournitures. */
export function FournituresPreview({ rapport, onChanger }) {
  const lignes = rapport.details || [];
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, gap: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Aperçu ({rapport.lignes_ok || 0} fournitures détectées)
        </Typography>
        <Button size="small" startIcon={<RestartAltIcon />} onClick={onChanger}>
          Changer
        </Button>
      </Box>
      {rapport.date_import && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Date du mouvement : {rapport.date_import}
        </Typography>
      )}
      {rapport.colonnes_manquantes?.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Colonnes manquantes : {rapport.colonnes_manquantes.join(", ")}
        </Alert>
      )}
      <TableContainer sx={{ maxHeight: 320 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {["Ligne", "Désignation", "Catégorie", "Quantité", "Observation", "Statut"].map((titre) => (
                <TableCell key={titre} sx={{ fontWeight: 700 }}>
                  {titre}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {lignes.slice(0, APERCU_MAX).map((row) => (
              <TableRow key={row.ligne} hover>
                <TableCell>{row.ligne}</TableCell>
                <TableCell>
                  <Chip label={row.designation || "—"} size="small" sx={{ fontWeight: 600, fontSize: 11 }} />
                </TableCell>
                <TableCell>{row.categorie || "-"}</TableCell>
                <TableCell>{row.quantite ?? "-"}</TableCell>
                <TableCell>
                  {row.statut === "ERREUR" ? (
                    <Typography variant="caption" color="error">
                      {row.message}
                    </Typography>
                  ) : (
                    row.observation || "-"
                  )}
                </TableCell>
                <TableCell>
                  {row.statut && <Chip label={row.statut} size="small" color={COULEUR_STATUT[row.statut] ?? "success"} sx={{ fontSize: 11 }} />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {lignes.length > APERCU_MAX && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          Seules les {APERCU_MAX} premières lignes sur {lignes.length} sont affichées.
        </Typography>
      )}
    </Paper>
  );
}
