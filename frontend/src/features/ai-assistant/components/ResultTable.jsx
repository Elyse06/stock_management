import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { ArrowForward as ArrowForwardIcon } from "@mui/icons-material";

const CELLULE = { fontSize: 11, py: 0.5, px: 1 };

/** Tableau de résultats produit par un outil (données exactes, non reformulées par le modèle). */
export function ResultTable({ tableau, onNaviguer }) {
  const { titre, colonnes, lignes, total, lien } = tableau;
  return (
    <Box sx={{ mt: 1.25 }}>
      <Typography variant="caption" fontWeight={700} sx={{ display: "block", mb: 0.5 }}>
        {titre}
        {total > lignes.length && (
          <Typography component="span" variant="caption" color="text.secondary">
            {" "}
            · {lignes.length} sur {total}
          </Typography>
        )}
      </Typography>
      <TableContainer sx={{ border: "1px solid #E0E0E0", borderRadius: 1, maxHeight: 220 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {colonnes.map((colonne) => (
                <TableCell key={colonne} sx={{ ...CELLULE, fontWeight: 700, bgcolor: "tint.main" }}>
                  {colonne}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {lignes.map((ligne, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <TableRow key={i}>
                {ligne.map((valeur, j) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <TableCell key={j} sx={CELLULE}>
                    {valeur}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {lien && (
        <Button size="small" endIcon={<ArrowForwardIcon fontSize="small" />} onClick={() => onNaviguer(lien.chemin)}
          sx={{ mt: 0.5, textTransform: "none", fontSize: 12 }}>
          {total > lignes.length ? `${lien.libelle} (${total})` : lien.libelle}
        </Button>
      )}
    </Box>
  );
}
